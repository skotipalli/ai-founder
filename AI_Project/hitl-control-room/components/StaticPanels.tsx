import { STAGES, type Feature, type Participant, type WorkItem } from "@/lib/board-data";
import { ChipBadge } from "./ChipBadge";

export function WorkPanel({ items }: { items: WorkItem[] }) {
  return (
    <section className="panel" aria-labelledby="h-wip">
      <div className="panel-head">
        <h2 id="h-wip">Work items in progress</h2>
        <span className="hint">Claimed → built → tested → PR → merged → live</span>
      </div>
      <ul className="wip">
        {items.map((w) => (
          <li key={w.title}>
            <span className="w-title">{w.title}</span>
            <ChipBadge chip={w.status} />
            <div className="w-meta">
              {w.meta.map((m) => (
                <span key={m.text} className={m.mono ? "mono" : undefined}>
                  {m.text}
                </span>
              ))}
            </div>
            <div className="steps" aria-label={w.ariaLabel}>
              {STAGES.map((stage, i) => (
                <span
                  key={stage}
                  className={i < w.completed ? "on" : i === w.completed && w.waiting ? "wait" : undefined}
                />
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

export function FeaturesPanel({ features }: { features: Feature[] }) {
  return (
    <section className="panel" aria-labelledby="h-feat">
      <div className="panel-head">
        <h2 id="h-feat">Features delivered</h2>
        <span className="hint">Live or merged</span>
      </div>
      <div className="features">
        {features.map((f) => (
          <div key={f.name} className="feat">
            <ChipBadge chip={f.status} style={{ justifySelf: "start" }} />
            <span className="f-name">{f.name}</span>
            <span className="f-meta">{f.meta}</span>
            <div className="f-foot">
              <span>{f.ref}</span>
              <span>{f.owners}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RosterRow({ p }: { p: Participant }) {
  return (
    <li>
      <span className={`avatar${p.human ? " human" : ""}`}>
        {p.initials}
        <span className={`st ${p.presence}`} />
      </span>
      <div>
        <div className="r-name">{p.name}</div>
        <div className="r-doing">{p.doing}</div>
      </div>
      <ChipBadge chip={p.chip} />
    </li>
  );
}

export function RosterPanel({ humans, agents }: { humans: Participant[]; agents: Participant[] }) {
  return (
    <section className="panel" aria-labelledby="h-who">
      <div className="panel-head">
        <h2 id="h-who">Who&apos;s here</h2>
        <span className="hint">Now doing</span>
      </div>
      <ul className="roster">
        <li className="group" aria-hidden="true">
          Humans
        </li>
        {humans.map((p) => (
          <RosterRow key={p.initials} p={p} />
        ))}
        <li className="group" aria-hidden="true">
          Agents
        </li>
        {agents.map((p) => (
          <RosterRow key={p.initials} p={p} />
        ))}
      </ul>
    </section>
  );
}

export function StrategyPanel({
  author,
  now,
  points,
}: {
  author: string;
  now: string;
  points: { text: string; emphasis?: string; changed?: boolean }[];
}) {
  return (
    <section className="panel" aria-labelledby="h-strat">
      <div className="panel-head">
        <h2 id="h-strat">Strategy update</h2>
        <span className="hint mono">{author}</span>
      </div>
      <div className="strategy">
        <p>
          <strong>Now:</strong> {now}
        </p>
        <ul>
          {points.map((pt) => {
            if (!pt.emphasis) {
              return (
                <li key={pt.text} className={pt.changed ? "changed" : undefined}>
                  {pt.text}
                </li>
              );
            }
            const [before, after] = pt.text.split(pt.emphasis);
            return (
              <li key={pt.text} className={pt.changed ? "changed" : undefined}>
                {before}
                <em>{pt.emphasis}</em>
                {after}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
