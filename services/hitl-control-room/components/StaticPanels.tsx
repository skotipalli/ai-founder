"use client";

import { fmtTime, postJSON } from "@/lib/client";
import { ROLES } from "@/lib/roles";
import { STAGES, type AgentState, type BoardState, type Feature, type Presence, type Tone, type WorkItem } from "@/lib/types";
import { ChipBadge } from "./ChipBadge";

export function WorkPanel({ items }: { items: WorkItem[] }) {
  return (
    <section className="panel" aria-labelledby="h-wip">
      <div className="panel-head">
        <h2 id="h-wip">Work items in progress</h2>
        <span className="hint">{STAGES.join(" → ")}</span>
      </div>
      <ul className="wip">
        {items.length === 0 && <li className="empty">No work items yet. Ask @pm to plan the work.</li>}
        {items.map((w) => (
          <li key={w.id}>
            <span className="w-title">{w.title}</span>
            <ChipBadge label={w.status} tone={w.tone} />
            <div className="w-meta">
              <span>{w.owners.join(" · ")}</span>
              {w.ref && <span className="mono">{w.ref}</span>}
            </div>
            <div
              className="steps"
              aria-label={`Stage ${w.stage} of ${STAGES.length}${w.blocked ? ", blocked" : ""}`}
            >
              {STAGES.map((stage, i) => (
                <span key={stage} className={i < w.stage ? "on" : i === w.stage && w.blocked ? "wait" : undefined} />
              ))}
            </div>
            <div className="step-labels" aria-hidden="true">
              {STAGES.map((stage) => (
                <span key={stage}>{stage}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const FEATURE_TONE: Record<Feature["status"], Tone> = { live: "ok", merged: "info", done: "info" };

export function FeaturesPanel({ features }: { features: Feature[] }) {
  return (
    <section className="panel" aria-labelledby="h-feat">
      <div className="panel-head">
        <h2 id="h-feat">Delivered</h2>
        <span className="hint">Done, merged or live</span>
      </div>
      {features.length === 0 ? (
        <p className="empty">Nothing delivered yet.</p>
      ) : (
        <div className="features">
          {features.map((f) => (
            <div key={f.id} className="feat">
              <ChipBadge label={f.status} tone={FEATURE_TONE[f.status]} style={{ justifySelf: "start" }} />
              <span className="f-name">{f.name}</span>
              <span className="f-meta">{f.summary}</span>
              <div className="f-foot">
                <span>{f.ref ?? ""}</span>
                <span>{f.owners.join(" · ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const PRESENCE: Record<Presence, { tone: Tone; dot: string }> = {
  working: { tone: "ok", dot: "working" },
  waiting: { tone: "attn", dot: "waiting" },
  idle: { tone: "idle", dot: "idle" },
  error: { tone: "block", dot: "stale" },
};

function AgentRow({ a }: { a: AgentState }) {
  const info = ROLES[a.role];
  return (
    <li>
      <span className="avatar" title={info.blurb}>
        {info.initials}
        <span className={`st ${PRESENCE[a.presence].dot}`} />
      </span>
      <div>
        <div className="r-name">
          {a.role} <span className="r-title">· {info.title}</span>
        </div>
        <div className="r-doing">
          {a.doing}
          {a.queued > 0 && ` · ${a.queued} queued`}
        </div>
      </div>
      {a.presence === "error" ? (
        <button type="button" className="btn" onClick={() => postJSON(`/api/agents/${a.role}/reset`)}>
          Reset
        </button>
      ) : (
        <ChipBadge label={a.presence} tone={PRESENCE[a.presence].tone} />
      )}
    </li>
  );
}

export function RosterPanel({ board }: { board: BoardState }) {
  const waitingOnOwner = board.attention.filter((a) => !a.resolution).length;
  const initials = board.owner
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section className="panel" aria-labelledby="h-who">
      <div className="panel-head">
        <h2 id="h-who">Who&apos;s here</h2>
        <span className="hint">Now doing</span>
      </div>
      <ul className="roster">
        <li className="group" aria-hidden="true">
          Human
        </li>
        <li>
          <span className="avatar human">
            {initials}
            <span className="st working" />
          </span>
          <div>
            <div className="r-name">{board.owner} · owner</div>
            <div className="r-doing">
              {waitingOnOwner ? `${waitingOnOwner} item${waitingOnOwner > 1 ? "s" : ""} waiting on you` : "Nothing waiting"}
            </div>
          </div>
          <ChipBadge label={String(waitingOnOwner)} tone={waitingOnOwner ? "block" : "idle"} />
        </li>
        <li className="group" aria-hidden="true">
          Agents
        </li>
        {board.agents.map((a) => (
          <AgentRow key={a.role} a={a} />
        ))}
      </ul>
    </section>
  );
}

export function StrategyPanel({ strategy }: { strategy?: BoardState["strategy"] }) {
  return (
    <section className="panel" aria-labelledby="h-strat">
      <div className="panel-head">
        <h2 id="h-strat">Strategy</h2>
        <span className="hint mono" suppressHydrationWarning>
          {strategy ? `pm · ${fmtTime(strategy.at)}` : "pm"}
        </span>
      </div>
      <div className="strategy">
        <p>{strategy ? strategy.text : "The pm hasn't written a strategy note yet."}</p>
      </div>
    </section>
  );
}
