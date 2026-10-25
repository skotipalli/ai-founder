"use client";

import { useState, type FormEvent } from "react";

export function DirectivePanel({ initialText, scopes }: { initialText: string; scopes: string[] }) {
  const [text, setText] = useState(initialText);
  const [scope, setScope] = useState(scopes[0]);
  const [status, setStatus] = useState("Mockup: nothing is sent.");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(`Mockup: this would pin the directive for ${scope}. Nothing was sent.`);
  }

  return (
    <section className="panel" aria-labelledby="h-dir">
      <div className="panel-head">
        <h2 id="h-dir">Directive</h2>
        <span className="hint">Overrides current work</span>
      </div>
      <form onSubmit={onSubmit}>
        <label htmlFor="dir-text" className="note">
          Tell every agent what to do next. It&apos;s pinned to the top of the board until you clear it.
        </label>
        <textarea id="dir-text" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          <select aria-label="Who it applies to" value={scope} onChange={(e) => setScope(e.target.value)}>
            {scopes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn primary" type="submit">
            Post directive
          </button>
        </div>
        <span className="note" role="status">
          {status}
        </span>
      </form>
    </section>
  );
}
