"use client";

import { useState, type FormEvent } from "react";
import type { FeedEntry, FeedKind } from "@/lib/board-data";
import { withMentions } from "./ChipBadge";

type Filter = "all" | FeedKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ask", label: "Asks" },
  { id: "warn", label: "Warns" },
  { id: "done", label: "Done" },
];

const KIND_TONE: Record<FeedKind, string> = { done: "ok", ask: "info", warn: "block" };

interface LocalMessage {
  id: string;
  text: string;
}

export function ChatPanel({ entries, author }: { entries: FeedEntry[]; author: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [local, setLocal] = useState<LocalMessage[]>([]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    // Mockup: messages stay in this browser tab only.
    setLocal((m) => [{ id: `local-${Date.now()}`, text }, ...m]);
    setDraft("");
  }

  return (
    <section className="panel" aria-labelledby="h-feed">
      <div className="panel-head">
        <h2 id="h-feed">Chat</h2>
        <div className="tabs" role="tablist" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              id={`tab-${f.id}`}
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
        {local.map((m) => (
          <li key={m.id} className="human" hidden={filter !== "all"}>
            <div className="fh">
              <span className="chip idle">you</span>
              <span className="mono">now</span>
              <span>{author} · not sent (mockup)</span>
            </div>
            <div className="ft">{m.text}</div>
          </li>
        ))}
        {entries.map((e) => (
          <li key={e.id} hidden={filter !== "all" && filter !== e.kind}>
            <div className="fh">
              <span className={`chip ${KIND_TONE[e.kind]}`}>{e.kind}</span>
              <span className="mono">{e.time}</span>
              <span>{withMentions(e.who)}</span>
            </div>
            <div className="ft">{withMentions(e.text)}</div>
          </li>
        ))}
      </ul>

      <form className="chat-form" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="sr-only">
          Message the board
        </label>
        <input
          id="chat-input"
          type="text"
          placeholder="Message the board, @mention an agent"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
