import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { RoleId } from "@/lib/types";
import { renderBoard, systemPrompt } from "./prompts";
import { addFeed, agent, getState, mutate } from "./store";
import { boardTools, stillWaiting, type Task } from "./tools";

const MODEL = process.env.HITL_MODEL ?? "claude-opus-5-5";
const MAX_DEPTH = Number(process.env.HITL_MAX_HANDOFF_DEPTH ?? 3);
const EFFORT: Record<RoleId, "low" | "medium" | "high"> = {
  pm: "medium",
  architect: "high",
  dev: "medium",
  qa: "medium",
};

interface RunnerState {
  client: Anthropic;
  queues: Map<RoleId, Task[]>;
  running: Set<RoleId>;
}

const g = globalThis as unknown as { __hitlRunner?: RunnerState };
const rs: RunnerState =
  g.__hitlRunner ?? (g.__hitlRunner = { client: new Anthropic(), queues: new Map(), running: new Set() });

const brief = (t: string) => (t.length > 90 ? `${t.slice(0, 87)}…` : t);

export function dispatch(task: Task) {
  const q = rs.queues.get(task.role) ?? [];
  q.push(task);
  rs.queues.set(task.role, q);
  mutate((s) => {
    agent(s, task.role).queued = q.length;
  });
  void drain(task.role);
}

async function drain(role: RoleId) {
  if (rs.running.has(role)) return;
  rs.running.add(role);
  try {
    const q = rs.queues.get(role) ?? [];
    let task: Task | undefined;
    while ((task = q.shift())) {
      mutate((s) => {
        const a = agent(s, role);
        a.queued = q.length;
        a.presence = "working";
        a.doing = brief(task!.text);
      });
      const ok = await runTask(task);
      if (!ok) break;
    }
  } finally {
    rs.running.delete(role);
    mutate((s) => {
      const a = agent(s, role);
      if (a.presence === "error") return;
      const waitingOn = stillWaiting(role);
      a.presence = waitingOn ? "waiting" : "idle";
      a.doing = waitingOn ? `Waiting on you: ${waitingOn}` : "Idle";
    });
  }
}

/** Runs one task. Returns false if the agent hit an error and its queue should pause. */
async function runTask(task: Task): Promise<boolean> {
  const { role } = task;
  const state = getState();
  const sender = task.from === "human" ? state.owner : task.from;

  try {
    const final = await rs.client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      max_iterations: 12,
      output_config: { effort: EFFORT[role] },
      // Server-side refusal fallback: if the model declines, the API reroutes by category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        {
          type: "text",
          text: systemPrompt(role, state.project, state.owner),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: boardTools({ role, depth: task.depth, maxDepth: MAX_DEPTH, dispatch }),
      messages: [
        {
          role: "user",
          content: `${renderBoard(state, role)}\n\n<task from="${sender}">\n${task.text}\n</task>`,
        },
      ],
    });

    if (final.stop_reason === "refusal") {
      mutate((s) =>
        addFeed(s, { kind: "warn", from: role, text: "Declined this task (safety refusal). Try rephrasing it." }),
      );
      return true;
    }

    const reply = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const truncated = final.stop_reason === "max_tokens" ? "\n\n[reply cut off at the length limit]" : "";
    if (reply) mutate((s) => addFeed(s, { kind: "info", from: role, to: sender, text: reply + truncated }));
    return true;
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? "No valid Claude API credentials. Set ANTHROPIC_API_KEY and restart the server."
        : err instanceof Anthropic.RateLimitError
          ? "Rate limited by the Claude API. Send the task again in a minute."
          : err instanceof Anthropic.APIError
            ? `Claude API error ${err.status ?? ""}: ${err.message}`
            : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`hitl: ${role} task failed`, err);
    mutate((s) => {
      addFeed(s, { kind: "warn", from: role, text: message });
      const a = agent(s, role);
      a.presence = "error";
      a.doing = brief(message);
    });
    // Pause this agent's queue; the next dispatch to it retries.
    return false;
  }
}

/** Clears an agent's error state so it can take new work. */
export function resetAgent(role: RoleId) {
  mutate((s) => {
    const a = agent(s, role);
    if (a.presence === "error") {
      a.presence = "idle";
      a.doing = "Idle";
    }
  });
}
