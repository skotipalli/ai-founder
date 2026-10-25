"use client";

import { useState, type FormEvent } from "react";
import { fmtTime, postJSON } from "@/lib/client";
import type { FeedEntry, FeedKind, Tone } from "@/lib/types";
import { withMentions } from "./ChipBadge";

type Filter = "all" | "ask" | "warn" | "done";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ask", label: "Asks" },
  { id: "warn", label: "Warns" },
  { id: "done", label: "Done" },
];

const KIND: Record<FeedKind, { tone: Tone; label: string }> = {
  done: { tone: "ok", label: "done" },
  ask: { tone: "info", label: "ask" },
  warn: { tone: "block", label: "warn" },
  info: { tone: "idle", label: "reply" },
  human: { tone: "attn", label: "you" },
  system: { tone: "idle", label: "board" },
};

const LONG = 480;

function FeedText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= LONG) return <div className="ft">{withMentions(text)}</div>;
  return (
    <div className="ft">
      {withMentions(open ? text : `${text.slice(0, LONG)}…`)}
      <button type="button" className="more" onClick={() => setOpen((o) => !o)}>
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

export function ChatPanel({ feed, owner }: { feed: FeedEntry[]; owner: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await postJSON<{ routedTo: string[] }>("/api/chat", { text });
    setSending(false);
    if (res.ok) {
      setDraft("");
      setStatus(`Sent to ${res.data.routedTo.join(", ")}.`);
    } else {
      setStatus(res.error);
    }
  }

  return (
    <section className="panel" aria-labelledby="h-feed">
      <div className="panel-head">
        <h2 id="h-feed">Chat</h2>
        <div className="tabs" role="tablist" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="tab"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="feed">
        {feed
          .filter((e) => filter === "all" || e.kind === filter)
          .map((e) => (
            <li key={e.id} className={e.kind === "human" ? "human" : undefined}>
              <div className="fh">
                <span className={`chip ${KIND[e.kind].tone}`}>{KIND[e.kind].label}</span>
                <span className="mono" suppressHydrationWarning>
                  {fmtTime(e.at)}
                </span>
                <span>
                  {e.from === "human" ? owner : e.from}
                  {e.to && (
                    <>
                      {" → "}
                      <span className="mention">{e.to === "human" ? owner : e.to}</span>
                    </>
                  )}
                </span>
              </div>
              <FeedText text={e.text} />
            </li>
          ))}
      </ul>

      <form className="chat-form" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="sr-only">
          Message the team
        </label>
        <input
          id="chat-input"
          type="text"
          placeholder="Message the team: @pm @architect @dev @qa or @all (default: pm)"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
      {status && (
        <p className="note chat-status" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
