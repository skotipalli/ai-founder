"use client";

import { useBoard } from "@/lib/client";
import type { BoardState } from "@/lib/types";
import { AttentionPanel } from "./AttentionPanel";
import { ChatPanel } from "./ChatPanel";
import { DirectivePanel } from "./DirectivePanel";
import { FeaturesPanel, RosterPanel, StrategyPanel, WorkPanel } from "./StaticPanels";
import { SummaryStrip } from "./SummaryStrip";

export function Board({ initial }: { initial: BoardState }) {
  const { board, live } = useBoard(initial);

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <h1>HITL · {board.project}</h1>
          <span className="sub">1 human · {board.agents.length} agents</span>
        </div>
        <span className="live">
          <span className={`dot${live ? "" : " off"}`} aria-hidden="true" /> {live ? "Live" : "Reconnecting…"}
        </span>
      </header>

      <SummaryStrip board={board} />

      <div className="main">
        <div className="col">
          <AttentionPanel items={board.attention} />
          <WorkPanel items={board.workItems} />
          <FeaturesPanel features={board.features} />
        </div>
        <div className="col">
          <RosterPanel board={board} />
          <ChatPanel feed={board.feed} owner={board.owner} />
        </div>
      </div>

      <div className="dock">
        <DirectivePanel directive={board.directive} />
        <StrategyPanel strategy={board.strategy} />
      </div>

      <footer>
        Agents run on the Claude API with board tools only: they plan, design and write code in chat, but can&apos;t
        run, test or deploy anything in this setup.
      </footer>
    </div>
  );
}
