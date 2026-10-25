"use client";

import { useEffect, useState } from "react";
import { ago, postJSON } from "@/lib/client";
import type { AttentionItem } from "@/lib/types";
import { ChipBadge } from "./ChipBadge";

const SEVERITY_LABEL = { block: "Blocks work", attn: "Decision", info: "FYI" } as const;
const RANK = { block: 0, attn: 1, info: 2 } as const;

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const open = items
    .filter((a) => !a.resolution)
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.createdAt.localeCompare(b.createdAt));
  const answered = items.filter((a) => a.resolution).slice(-3).reverse();

  async function answer(item: AttentionItem, option: string) {
    setBusy(item.id);
    setError(null);
    const res = await postJSON(`/api/attention/${item.id}`, { option, note: notes[item.id] ?? "" });
    setBusy(null);
    if (!res.ok) setError(res.error);
  }

  return (
    <section className="panel" aria-labelledby="h-attn">
      <div className="panel-head">
        <h2 id="h-attn">Needs your attention</h2>
        <span className="hint">Most blocking first</span>
      </div>
      {error && <p className="err">{error}</p>}
      <ul className="attn-list">
        {open.length === 0 && answered.length === 0 && <li className="empty">Nothing waiting on you.</li>}
        {open.map((item) => (
          <li key={item.id} className="attn-item">
            <span className={`sev ${item.severity}`} />
            <div className="attn-body">
              <span className="attn-title">{item.title}</span>
              <div className="attn-meta">
                <ChipBadge label={SEVERITY_LABEL[item.severity]} tone={item.severity} />
                <span>
                  Raised by <span className="owner">{item.raisedBy}</span>
                </span>
                <span suppressHydrationWarning>Waiting {ago(item.createdAt, nowMs)}</span>
              </div>
              {item.detail && <p className="detail">{item.detail}</p>}
              <input
                className="note-input"
                type="text"
                placeholder="Add a note (optional)"
                aria-label={`Note for: ${item.title}`}
                value={notes[item.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
              />
            </div>
            <div className="act">
              {item.options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  className={`btn${i === 0 ? " primary" : ""}`}
                  disabled={busy === item.id}
                  onClick={() => answer(item, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </li>
        ))}
        {answered.map((item) => (
          <li key={item.id} className="attn-item resolved">
            <span className="sev" />
            <div className="attn-body">
              <span className="attn-title">{item.title}</span>
              <div className="attn-meta">
                <ChipBadge label={`answered: ${item.resolution!.option}`} tone="ok" />
                <span>
                  for <span className="owner">{item.raisedBy}</span>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
