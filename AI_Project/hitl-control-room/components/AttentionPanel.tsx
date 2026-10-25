"use client";

import { ChipBadge } from "./ChipBadge";
import { useAttention } from "./AttentionContext";

export function AttentionPanel() {
  const { items, resolved, resolve } = useAttention();

  return (
    <section className="panel" aria-labelledby="h-attn">
      <div className="panel-head">
        <h2 id="h-attn">Needs your attention</h2>
        <span className="hint">Most blocking first</span>
      </div>
      <ul className="attn-list">
        {items.map((item) => {
          const handledBy = resolved[item.id];
          const isResolved = handledBy !== undefined;
          return (
            <li key={item.id} className={`attn-item${isResolved ? " resolved" : ""}`}>
              <span className={`sev ${item.severity}`} />
              <div className="attn-body">
                <span className="attn-title">{item.title}</span>
                <div className="attn-meta">
                  <ChipBadge chip={item.chip} />
                  {item.source && (
                    <span>
                      {item.source.verb} <span className="owner">{item.source.owner}</span>
                      {item.source.note && ` · ${item.source.note}`}
                    </span>
                  )}
                  {item.extra && <span>{item.extra}</span>}
                </div>
              </div>
              <div className="act">
                {item.actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className={`btn${a.primary ? " primary" : ""}`}
                    disabled={isResolved}
                    onClick={() => resolve(item.id, a.label)}
                  >
                    {handledBy === a.label ? "Handled" : a.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
