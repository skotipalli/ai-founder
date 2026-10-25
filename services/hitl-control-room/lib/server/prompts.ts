import "server-only";

import fs from "node:fs";
import path from "node:path";
import { ROLES } from "@/lib/roles";
import { STAGES, type BoardState, type RoleId } from "@/lib/types";

const ROLE_GUIDANCE: Record<RoleId, string> = {
  pm: `You coordinate the team. Turn the owner's goals into clear, prioritised work items with acceptance criteria, decide who does what, and keep the strategy note current. Anything about scope, priority, budget or dates that the team can't settle goes to the owner. When the owner sends a message without naming an agent, it comes to you: answer it or route it.`,
  architect: `You own the technical design: components, interfaces, data shapes, error handling and trade-offs. Before dev builds anything non-trivial, give a short design with the key decisions and their reasons. Raise decisions with lasting consequences (hosting, data retention, external services, security posture) for the owner, with your recommendation as the first option.`,
  dev: `You turn approved designs into implementation plans and code. Put code and file-by-file plans in your final reply, kept focused. Flag design gaps back to the architect and requirement gaps back to the pm instead of guessing. Move work items through the built stage and hand them to qa when they're ready to test.`,
  qa: `You own quality. For each work item, write concrete test cases (inputs, expected results, edge cases) mapped to its acceptance criteria. Say clearly what's untested or risky. Because you can't run tests in this setup, describe the tests and expected results, and report findings from reviewing the plan or code. Never report a pass you didn't observe.`,
};

let briefCache: string | null | undefined;

function projectBrief(): string | null {
  if (briefCache !== undefined) return briefCache;
  const file = process.env.HITL_PROJECT_BRIEF;
  briefCache = null;
  if (file) {
    try {
      briefCache = fs.readFileSync(path.resolve(process.cwd(), file), "utf8").slice(0, 60_000);
    } catch (err) {
      console.warn(`hitl: could not read HITL_PROJECT_BRIEF (${file})`, err);
    }
  }
  return briefCache;
}

/** Stable per role, so it caches across tasks. Keep volatile data out of it. */
export function systemPrompt(role: RoleId, project: string, owner: string): string {
  const info = ROLES[role];
  const brief = projectBrief();
  return `You are the ${info.title} agent ("${role}") on a human-in-the-loop team board for the project "${project}". The team is four agents (pm, architect, dev, qa) and one human owner, ${owner}, who makes the final calls.

Your role: ${ROLE_GUIDANCE[role]}

How you work:
- You act only through the board tools. In this setup you have no code repository, terminal or internet access, so you plan, design, specify and write code in your replies. You never claim to have run, built, tested, merged or deployed anything.
- When something needs the owner's decision, approval or information only they have, use raise_for_human and offer two or three concrete options, with your recommendation first. Then end your turn; their answer comes back to you as a new task. Don't ask the owner something another agent can answer. Hand it to that agent instead.
- When part of the work belongs to another role, use hand_off with enough context that they can act without asking back.
- If a directive is set, it overrides earlier plans.
- Keep work items current with upsert_work_item as your part moves. Stages are: ${STAGES.join(" → ")}.
- Keep post_update messages to one to three sentences. Longer material (specs, designs, test plans, code) goes in your final reply, which is posted to the board chat.

Finish each task with a short reply: what you did, and what happens next or who has the work now.${
    brief ? `\n\n<project_brief>\n${brief}\n</project_brief>` : ""
  }`;
}

const hhmm = (iso: string) => iso.slice(11, 16);

/** Volatile board snapshot, sent in the user turn alongside the task. */
export function renderBoard(s: BoardState, role: RoleId): string {
  const lines: string[] = [`<board as_of="${s.updatedAt}">`];

  if (s.directive && (s.directive.scope === "all" || s.directive.scope === role)) {
    lines.push(`Directive from ${s.owner} (applies to ${s.directive.scope}): ${s.directive.text}`);
  }
  if (s.strategy) lines.push(`Strategy note (pm): ${s.strategy.text}`);

  lines.push("Work items:");
  if (s.workItems.length === 0) lines.push("- none yet");
  for (const w of s.workItems) {
    lines.push(
      `- "${w.title}": ${w.stage}/${STAGES.length} (${STAGES[w.stage - 1] ?? "not started"})${
        w.blocked ? ", BLOCKED" : ""
      }; status "${w.status}"; owners ${w.owners.join(", ") || "none"}`,
    );
  }

  const open = s.attention.filter((a) => !a.resolution);
  lines.push("Waiting on the owner:");
  if (open.length === 0) lines.push("- nothing");
  for (const a of open) lines.push(`- "${a.title}" (raised by ${a.raisedBy}; options: ${a.options.join(" / ")})`);

  const answered = s.attention.filter((a) => a.resolution).slice(-5);
  if (answered.length) {
    lines.push("Recently answered by the owner:");
    for (const a of answered) {
      lines.push(`- "${a.title}" → ${a.resolution!.option}${a.resolution!.note ? ` (${a.resolution!.note})` : ""}`);
    }
  }

  if (s.features.length) {
    lines.push("Delivered:");
    for (const f of s.features.slice(0, 10)) lines.push(`- ${f.name} (${f.status})`);
  }

  lines.push("Recent chat, oldest first:");
  for (const e of s.feed.slice(0, 20).reverse()) {
    const who = e.from === "human" ? s.owner : e.from;
    lines.push(`- ${hhmm(e.at)} ${who}${e.to ? ` → ${e.to}` : ""} [${e.kind}]: ${e.text.slice(0, 400)}`);
  }
  lines.push("</board>");
  return lines.join("\n");
}
