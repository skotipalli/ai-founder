"use client";

import { useState, type FormEvent } from "react";
import { fmtTime, postJSON } from "@/lib/client";
import { ROLE_IDS, type Directive } from "@/lib/types";

export function DirectivePanel({ directive }: { directive?: Directive }) {
  const [text, setText] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const res = await postJSON<{ notified: string[] }>("/api/directive", { text, scope });
    setBusy(false);
    if (res.ok) {
      setText("");
      setStatus(`Pinned and sent to ${res.data.notified.join(", ")}.`);
    } else {
      setStatus(res.error);
    }
  }

  async function clear() {
    const res = await postJSON("/api/directive", undefined, "DELETE");
    setStatus(res.ok ? "Directive cleared." : res.error);
  }

  return (
    <section className="panel" aria-labelledby="h-dir">
      <div className="panel-head">
        <h2 id="h-dir">Directive</h2>
        <span className="hint">Overrides current work</span>
      </div>
      <form onSubmit={onSubmit}>
        {directive ? (
          <div className="pinned">
            <span className="note" suppressHydrationWarning>
              Pinned for {directive.scope === "all" ? "all agents" : directive.scope} · {fmtTime(directive.at)}
            </span>
            <p>{directive.text}</p>
            <button type="button" className="btn" onClick={clear}>
              Clear directive
            </button>
          </div>
        ) : (
          <span className="note">No directive is pinned.</span>
        )}
        <label htmlFor="dir-text" className="note">
          Tell the agents what to do next. It stays pinned in their context until you clear it.
        </label>
        <textarea id="dir-text" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          <select aria-label="Who it applies to" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All agents</option>
            {ROLE_IDS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
            Post directive
          </button>
        </div>
        {status && (
          <span className="note" role="status">
            {status}
          </span>
        )}
      </form>
    </section>
  );
}
