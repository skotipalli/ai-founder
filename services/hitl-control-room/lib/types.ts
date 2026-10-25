// Shared board types, safe to import from client and server code.

export type Tone = "block" | "attn" | "info" | "ok" | "idle";

export const ROLE_IDS = ["pm", "architect", "dev", "qa"] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const STAGES = ["claimed", "designed", "built", "tested", "reviewed", "done"] as const;

export type Presence = "working" | "waiting" | "idle" | "error";

export interface WorkItem {
  id: string;
  title: string;
  owners: RoleId[];
  /** Number of completed stages, 0 to STAGES.length. */
  stage: number;
  blocked: boolean;
  status: string;
  tone: Tone;
  ref?: string;
  updatedAt: string;
}

export interface AttentionItem {
  id: string;
  title: string;
  severity: "block" | "attn" | "info";
  raisedBy: RoleId;
  detail?: string;
  options: string[];
  createdAt: string;
  resolution?: { option: string; note?: string; at: string };
}

export interface Feature {
  id: string;
  name: string;
  summary: string;
  status: "live" | "merged" | "done";
  owners: RoleId[];
  ref?: string;
  at: string;
}

export type FeedKind = "done" | "ask" | "warn" | "info" | "human" | "system";

export interface FeedEntry {
  id: string;
  kind: FeedKind;
  at: string;
  from: RoleId | "human" | "system";
  to?: string;
  text: string;
}

export interface AgentState {
  role: RoleId;
  presence: Presence;
  doing: string;
  queued: number;
}

export interface Directive {
  text: string;
  scope: RoleId | "all";
  at: string;
}

export interface BoardState {
  project: string;
  owner: string;
  agents: AgentState[];
  workItems: WorkItem[];
  attention: AttentionItem[];
  features: Feature[];
  feed: FeedEntry[];
  directive?: Directive;
  strategy?: { text: string; at: string };
  updatedAt: string;
}
