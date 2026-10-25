import "server-only";

import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROLE_IDS, type AgentState, type BoardState, type FeedEntry, type RoleId } from "@/lib/types";

const DATA_FILE = path.join(process.cwd(), "data", "board.json");
const FEED_LIMIT = 200;

interface Store {
  state: BoardState;
  events: EventEmitter;
  saveTimer?: NodeJS.Timeout;
}

export const now = () => new Date().toISOString();
export const newId = () => randomUUID().slice(0, 8);

function initialState(): BoardState {
  return {
    project: process.env.HITL_PROJECT ?? "FNOL Processor",
    owner: process.env.HITL_OWNER ?? "Owner",
    agents: ROLE_IDS.map((role) => ({ role, presence: "idle", doing: "Idle", queued: 0 })),
    workItems: [],
    attention: [],
    features: [],
    feed: [
      {
        id: newId(),
        kind: "system",
        at: now(),
        from: "system",
        text: "Board created. Message @pm to kick things off, or @mention any agent.",
      },
    ],
    updatedAt: now(),
  };
}

function load(): BoardState {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as BoardState;
    // Agents can't still be mid-task after a restart.
    saved.agents = ROLE_IDS.map((role) => {
      const prev = saved.agents?.find((a) => a.role === role);
      const waiting = saved.attention?.some((a) => a.raisedBy === role && !a.resolution);
      return {
        role,
        presence: waiting ? "waiting" : "idle",
        doing: waiting ? (prev?.doing ?? "Waiting on you") : "Idle",
        queued: 0,
      } satisfies AgentState;
    });
    return saved;
  } catch {
    return initialState();
  }
}

// Kept on globalThis so dev-server hot reloads don't reset the board.
const g = globalThis as unknown as { __hitlStore?: Store };
const store: Store =
  g.__hitlStore ??
  (g.__hitlStore = (() => {
    const events = new EventEmitter();
    events.setMaxListeners(200);
    return { state: load(), events };
  })());

function persist() {
  clearTimeout(store.saveTimer);
  store.saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(store.state, null, 2));
    } catch (err) {
      console.error("hitl: failed to save board", err);
    }
  }, 250);
}

export function getState(): BoardState {
  return store.state;
}

export function snapshot(): BoardState {
  return structuredClone(store.state);
}

export function mutate(fn: (s: BoardState) => void) {
  fn(store.state);
  store.state.updatedAt = now();
  persist();
  store.events.emit("change");
}

export function onChange(listener: () => void): () => void {
  store.events.on("change", listener);
  return () => store.events.off("change", listener);
}

export function addFeed(s: BoardState, entry: Omit<FeedEntry, "id" | "at">) {
  s.feed.unshift({ id: newId(), at: now(), ...entry });
  if (s.feed.length > FEED_LIMIT) s.feed.length = FEED_LIMIT;
}

export function agent(s: BoardState, role: RoleId): AgentState {
  return s.agents.find((a) => a.role === role)!;
}
