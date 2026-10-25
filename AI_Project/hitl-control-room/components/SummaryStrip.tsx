"use client";

import { useAttention } from "./AttentionContext";

export function SummaryStrip({ agentsWorking, doneToday }: { agentsWorking: number; doneToday: number }) {
  const { openBlocking, openDecisions } = useAttention();

  return (
    <div className="summary" role="list" aria-label="Board summary">
      <div className="stat block" role="listitem">
        <span className="n">{openBlocking}</span>
        <span className="k">Blocked on a human</span>
      </div>
      <div className="stat attn" role="listitem">
        <span className="n">{openDecisions}</span>
        <span className="k">Need a decision</span>
      </div>
      <div className="stat" role="listitem">
        <span className="n">{agentsWorking}</span>
        <span className="k">Agents working</span>
      </div>
      <div className="stat ok" role="listitem">
        <span className="n">{doneToday}</span>
        <span className="k">Done today</span>
      </div>
    </div>
  );
}
