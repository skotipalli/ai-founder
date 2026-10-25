import "server-only";

import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ROLE_IDS, STAGES, type RoleId } from "@/lib/types";
import { addFeed, agent, getState, mutate, newId, now } from "./store";

export interface Task {
  role: RoleId;
  text: string;
  from: RoleId | "human" | "system";
  depth: number;
}

export interface ToolContext {
  role: RoleId;
  depth: number;
  maxDepth: number;
  dispatch: (task: Task) => void;
}

const otherRoles = (self: RoleId) => ROLE_IDS.filter((r) => r !== self) as [RoleId, ...RoleId[]];

export function boardTools(ctx: ToolContext) {
  const { role } = ctx;

  const postUpdate = betaZodTool({
    name: "post_update",
    description:
      "Post a short message (one to three sentences) to the board chat. kind: 'done' = finished work, 'ask' = question or request to another agent, 'warn' = a problem or risk, 'info' = anything else.",
    inputSchema: z.object({
      kind: z.enum(["done", "ask", "warn", "info"]),
      text: z.string().min(1).max(600),
      to: z.enum(ROLE_IDS).optional().describe("Agent this is addressed to, if any"),
    }),
    run: async ({ kind, text, to }) => {
      mutate((s) => addFeed(s, { kind, from: role, to, text }));
      return "Posted.";
    },
  });

  const upsertWorkItem = betaZodTool({
    name: "upsert_work_item",
    description: `Create or update a work item, matched by title (case-insensitive). stage = number of completed stages out of ${STAGES.length} (${STAGES.join(", ")}). You are added as an owner.`,
    inputSchema: z.object({
      title: z.string().min(1).max(120),
      stage: z.number().int().min(0).max(STAGES.length),
      status: z.string().min(1).max(60).describe("Short status label, e.g. 'designing', 'needs decision', 'ready for qa'"),
      blocked: z.boolean().describe("True if the next stage is waiting on someone"),
      tone: z.enum(["ok", "attn", "block", "info"]).describe("ok = moving, attn = needs input, block = blocked, info = neutral"),
      ref: z.string().max(80).optional().describe("Optional reference, e.g. a design name or doc section"),
      add_owners: z.array(z.enum(ROLE_IDS)).max(4).optional(),
    }),
    run: async (input) => {
      let id = "";
      mutate((s) => {
        let item = s.workItems.find((w) => w.title.toLowerCase() === input.title.toLowerCase());
        if (!item) {
          item = { id: newId(), title: input.title, owners: [], stage: 0, blocked: false, status: "", tone: "info", updatedAt: now() };
          s.workItems.unshift(item);
        }
        Object.assign(item, {
          stage: input.stage,
          status: input.status,
          blocked: input.blocked,
          tone: input.tone,
          ref: input.ref ?? item.ref,
          updatedAt: now(),
        });
        for (const o of [role, ...(input.add_owners ?? [])]) if (!item.owners.includes(o)) item.owners.push(o);
        id = item.id;
      });
      return `Work item saved (id ${id}).`;
    },
  });

  const raiseForHuman = betaZodTool({
    name: "raise_for_human",
    description:
      "Ask the human owner for a decision, approval or information only they have. Offer 2–3 concrete options with your recommendation first. Their answer comes back to you later as a new task, so end your turn after raising unless you have other independent work.",
    inputSchema: z.object({
      title: z.string().min(1).max(160).describe("The question or decision, phrased so it can be answered from the options"),
      severity: z.enum(["block", "attn", "info"]).describe("block = work is stopped until answered, attn = decision needed soon, info = FYI"),
      detail: z.string().max(800).optional().describe("Context and your recommendation"),
      options: z.array(z.string().min(1).max(40)).min(1).max(3),
    }),
    run: async ({ title, severity, detail, options }) => {
      const id = newId();
      mutate((s) => {
        s.attention.push({ id, title, severity, detail, options, raisedBy: role, createdAt: now() });
        addFeed(s, { kind: "ask", from: role, to: "human", text: title });
        const a = agent(s, role);
        a.presence = "waiting";
        a.doing = `Waiting on you: ${title}`;
      });
      return `Raised for the owner (id ${id}). Their answer will arrive as a new task.`;
    },
  });

  const handOff = betaZodTool({
    name: "hand_off",
    description:
      "Give a task to another agent. Include the context they need to act without asking back. The other agent picks it up after its current work.",
    inputSchema: z.object({
      to: z.enum(otherRoles(role)),
      task: z.string().min(1).max(3000),
    }),
    run: async ({ to, task }) => {
      if (ctx.depth >= ctx.maxDepth) {
        mutate((s) =>
          addFeed(s, {
            kind: "warn",
            from: "system",
            text: `Hand-off chain limit reached (${ctx.maxDepth}); ${role} → ${to} was not delivered. The owner can restart it with a message.`,
          }),
        );
        return `Not delivered: the hand-off chain limit (${ctx.maxDepth}) is reached. Summarise what ${to} should do in your final reply instead, so the owner can forward it.`;
      }
      mutate((s) => addFeed(s, { kind: "ask", from: role, to, text: task.length > 280 ? `${task.slice(0, 277)}…` : task }));
      ctx.dispatch({ role: to, text: task, from: role, depth: ctx.depth + 1 });
      return `Handed to ${to}.`;
    },
  });

  const recordFeature = betaZodTool({
    name: "record_feature",
    description: "Record a deliverable as finished (e.g. an approved spec, a design, a completed test plan).",
    inputSchema: z.object({
      name: z.string().min(1).max(80),
      summary: z.string().min(1).max(200),
      status: z.enum(["done", "merged", "live"]),
      ref: z.string().max(80).optional(),
    }),
    run: async ({ name, summary, status, ref }) => {
      mutate((s) => {
        s.features.unshift({ id: newId(), name, summary, status, ref, owners: [role], at: now() });
        addFeed(s, { kind: "done", from: role, text: `Delivered: ${name}` });
      });
      return "Recorded.";
    },
  });

  const updateStrategy = betaZodTool({
    name: "update_strategy",
    description: "Replace the strategy note shown on the board: the current focus and what changed, in a few sentences.",
    inputSchema: z.object({ text: z.string().min(1).max(1200) }),
    run: async ({ text }) => {
      mutate((s) => {
        s.strategy = { text, at: now() };
        addFeed(s, { kind: "info", from: "pm", text: "Updated the strategy note." });
      });
      return "Strategy updated.";
    },
  });

  const shared = [postUpdate, upsertWorkItem, raiseForHuman, handOff, recordFeature];
  return role === "pm" ? [...shared, updateStrategy] : shared;
}

export function stillWaiting(role: RoleId): string | undefined {
  return getState().attention.find((a) => a.raisedBy === role && !a.resolution)?.title;
}
