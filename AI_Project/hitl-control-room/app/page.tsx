import * as board from "@/lib/board-data";
import { AttentionProvider } from "@/components/AttentionContext";
import { AttentionPanel } from "@/components/AttentionPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { DirectivePanel } from "@/components/DirectivePanel";
import { FeaturesPanel, RosterPanel, StrategyPanel, WorkPanel } from "@/components/StaticPanels";
import { SummaryStrip } from "@/components/SummaryStrip";

export default function Page() {
  return (
    <AttentionProvider items={board.attentionItems}>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <h1>{board.header.title}</h1>
            <span className="sub">{board.header.sub}</span>
            <span className="sample">{board.header.sample}</span>
          </div>
          <span className="live">
            <span className="dot" aria-hidden="true" /> {board.header.live}
          </span>
        </header>

        <SummaryStrip agentsWorking={board.stats.agentsWorking} doneToday={board.stats.doneToday} />

        <div className="main">
          <div className="col">
            <WorkPanel items={board.workItems} />
            <AttentionPanel />
            <FeaturesPanel features={board.features} />
          </div>
          <div className="col">
            <RosterPanel humans={board.humans} agents={board.agents} />
            <ChatPanel entries={board.feed} author={board.humans[0].name.split(" ·")[0]} />
          </div>
        </div>

        <div className="dock">
          <DirectivePanel initialText={board.directive.text} scopes={board.directive.scopes} />
          <StrategyPanel {...board.strategy} />
        </div>

        <footer>{board.footer}</footer>
      </div>
    </AttentionProvider>
  );
}
