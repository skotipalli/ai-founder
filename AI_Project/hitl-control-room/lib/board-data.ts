// Sample content from the original mockup (MemoryManager board, Oct 24, 2026).
// Swap this module for a real data source when the board goes live.

export type Tone = "block" | "attn" | "info" | "ok" | "idle";

export interface Chip {
  label: string;
  tone: Tone;
}

export const STAGES = ["claimed", "built", "tested", "PR", "merged", "live"] as const;

export interface WorkItem {
  title: string;
  status: Chip;
  meta: { text: string; mono?: boolean }[];
  /** Number of completed stages (0–6). */
  completed: number;
  /** Whether the next stage is blocked/waiting. */
  waiting: boolean;
  ariaLabel: string;
}

export interface AttentionItem {
  id: string;
  title: string;
  severity: "block" | "attn" | "info";
  chip: Chip;
  source?: { verb: string; owner: string; note?: string };
  extra?: string;
  actions: { label: string; primary?: boolean }[];
}

export interface Feature {
  status: Chip;
  name: string;
  meta: string;
  ref: string;
  owners: string;
}

export type Presence = "working" | "waiting" | "stale" | "idle";

export interface Participant {
  initials: string;
  name: string;
  doing: string;
  presence: Presence;
  chip: Chip;
  human?: boolean;
}

export type FeedKind = "done" | "ask" | "warn";

export interface FeedEntry {
  id: string;
  kind: FeedKind;
  time: string;
  who: string;
  text: string;
}

export const header = {
  title: "HITL · MemoryManager",
  sub: "2 humans · 5 agents",
  sample: "Mockup · sample data from Oct 24",
  live: "Live · last entry 2 min ago",
};

export const stats = {
  agentsWorking: 4,
  doneToday: 11,
};

export const workItems: WorkItem[] = [
  {
    title: "Waitlist with SQLite",
    status: { label: "waiting on you", tone: "attn" },
    meta: [{ text: "dev builds · qa tests · devops ships" }, { text: "4537d34", mono: true }],
    completed: 3,
    waiting: true,
    ariaLabel: "Step 3 of 6, tested; blocked on the privacy policy",
  },
  {
    title: "Privacy policy and terms",
    status: { label: "needs email", tone: "attn" },
    meta: [{ text: "pm writes · dev renders · qa verifies" }, { text: "e18ba27", mono: true }],
    completed: 2,
    waiting: true,
    ariaLabel: "Step 2 of 6, built",
  },
  {
    title: "Server config: anonymized logs, HTTPS",
    status: { label: "PR #1 open", tone: "block" },
    meta: [{ text: "devops" }, { text: "8930833", mono: true }],
    completed: 4,
    waiting: true,
    ariaLabel: "Step 4 of 6, PR open",
  },
  {
    title: "Vendor memory controls research",
    status: { label: "working", tone: "ok" },
    meta: [{ text: "dev" }, { text: "for compliance Q12" }],
    completed: 1,
    waiting: false,
    ariaLabel: "Step 1 of 6, claimed",
  },
];

export const attentionItems: AttentionItem[] = [
  {
    id: "merge-pr-1",
    title: "Merge PR #1 dev → main",
    severity: "block",
    chip: { label: "Blocks 3 agents", tone: "block" },
    source: { verb: "Raised by", owner: "devops", note: "tests 42/0, 26/0" },
    extra: "Waiting 38 min",
    actions: [{ label: "Review PR", primary: true }],
  },
  {
    id: "contact-email",
    title: "Give the contact email for the privacy policy",
    severity: "block",
    chip: { label: "Blocks waitlist launch", tone: "block" },
    source: { verb: "Asked by", owner: "pm" },
    extra: "Waiting 1 h 12 min",
    actions: [{ label: "Answer", primary: true }],
  },
  {
    id: "retention",
    title: "Approve retention: 12 months for waitlist, 30 days for deletion",
    severity: "attn",
    chip: { label: "Decision", tone: "attn" },
    source: { verb: "Proposed by", owner: "pm", note: "agreed by ux, qa" },
    actions: [{ label: "Approve" }, { label: "Change" }],
  },
  {
    id: "freeze-date",
    title: "Freeze date for the test set: Fri Oct 30, or move it",
    severity: "attn",
    chip: { label: "Decision", tone: "attn" },
    source: { verb: "Proposed by", owner: "qa", note: "needs a minimal build first" },
    actions: [{ label: "Decide" }],
  },
  {
    id: "north-star",
    title: "Approve the problem, north star and persona",
    severity: "attn",
    chip: { label: "Decision", tone: "attn" },
    source: { verb: "From", owner: "pm", note: "spec waits on it" },
    actions: [{ label: "Open frame" }],
  },
  {
    id: "dev-stale",
    title: "dev hasn't read the board in 30 min",
    severity: "info",
    chip: { label: "Agent stale", tone: "info" },
    extra: "Missed the stop-work notice at 13:00",
    actions: [{ label: "Ping" }],
  },
];

export const features: Feature[] = [
  {
    status: { label: "live", tone: "ok" },
    name: "Landing page",
    meta: "memorymanager.getkapi.com · self-hosted fonts, no trackers",
    ref: "55313bd",
    owners: "dev · ux",
  },
  {
    status: { label: "live", tone: "ok" },
    name: "Share card, favicon, 404",
    meta: "Link previews in Slack, LinkedIn, X",
    ref: "d30956b",
    owners: "ux · dev",
  },
  {
    status: { label: "adopted", tone: "info" },
    name: "Release flow",
    meta: "Commit on dev, PR to main, deploy from main",
    ref: "43a16d6",
    owners: "pm · devops",
  },
  {
    status: { label: "done", tone: "info" },
    name: "Market scan",
    meta: "Competitors, regulation, Fidelity context",
    ref: "docs/research",
    owners: "pm",
  },
];

export const humans: Participant[] = [
  {
    initials: "BV",
    name: "Balaji · owner",
    doing: "2 items waiting on you",
    presence: "working",
    chip: { label: "2", tone: "block" },
    human: true,
  },
  {
    initials: "SR",
    name: "Sam · reviewer (example)",
    doing: "Can approve PRs · away",
    presence: "idle",
    chip: { label: "away", tone: "idle" },
    human: true,
  },
];

export const agents: Participant[] = [
  { initials: "PM", name: "pm", doing: "Finalizing privacy policy", presence: "working", chip: { label: "working", tone: "ok" } },
  { initials: "DV", name: "dev", doing: "Waitlist done · waiting on PR #1", presence: "waiting", chip: { label: "waiting", tone: "attn" } },
  { initials: "UX", name: "ux", doing: "First-email copy spec", presence: "working", chip: { label: "working", tone: "ok" } },
  { initials: "QA", name: "qa", doing: "Testing waitlist at 4537d34", presence: "working", chip: { label: "working", tone: "ok" } },
  { initials: "OP", name: "devops", doing: "Owns push gate · PR #2 queued", presence: "working", chip: { label: "working", tone: "ok" } },
];

export const feed: FeedEntry[] = [
  { id: "f1", kind: "done", time: "15:44", who: "dev", text: "Applied ux's waitlist fixes in 4537d34." },
  { id: "f2", kind: "ask", time: "15:42", who: "devops → @pm", text: "Add the waitlist tests to the push-gate list in the release-flow skill." },
  { id: "f3", kind: "done", time: "15:41", who: "devops", text: "Waitlist ops ready locally: systemd unit, backups, nginx proxy." },
  { id: "f4", kind: "warn", time: "15:20", who: "devops", text: "Push to origin/dev on hold: schema-test 25/1. Fix assigned to @dev." },
  { id: "f5", kind: "warn", time: "15:19", who: "devops", text: "Working tree moving from main to dev now." },
  { id: "f6", kind: "ask", time: "15:10", who: "pm → all", text: "New task: llms.txt, robots.txt, privacy policy, terms." },
  { id: "f7", kind: "done", time: "14:56", who: "devops", text: "Landing page is live." },
];

export const directive = {
  text: "Stop new features. Ship the waitlist and the final privacy policy together, then pause for review.",
  scopes: ["All agents", "dev", "ux", "qa", "devops", "pm"],
};

export const strategy = {
  author: "pm · 15:16",
  now: "ship the personal cross-AI memory landing page and waitlist. Build nothing on the product itself until the spec is approved.",
  points: [
    { text: "The research points to governed team memory as the open gap. The personal market is crowded.", emphasis: "governed team memory" },
    { text: "Changed today: landing page is for the original personal product, not the team version.", changed: true },
    { text: "Next decision: approve the problem, north star and persona, then the spec." },
  ] as { text: string; emphasis?: string; changed?: boolean }[],
};

export const footer =
  'Mockup of a human-in-the-loop board for people and agents. Data is sample content from the MemoryManager board, Oct 24, 2026; "Sam" is an example second human.';
