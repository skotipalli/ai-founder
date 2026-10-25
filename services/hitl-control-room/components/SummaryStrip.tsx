import type { BoardState } from "@/lib/types";

export function SummaryStrip({ board }: { board: BoardState }) {
  const open = board.attention.filter((a) => !a.resolution);
  const today = new Date().toDateString();
  const stats = [
    { cls: "block", n: open.filter((a) => a.severity === "block").length, k: "Blocked on you" },
    { cls: "attn", n: open.filter((a) => a.severity === "attn").length, k: "Need a decision" },
    { cls: "", n: board.agents.filter((a) => a.presence === "working").length, k: "Agents working" },
    {
      cls: "ok",
      n: board.feed.filter((e) => e.kind === "done" && new Date(e.at).toDateString() === today).length,
      k: "Done today",
    },
  ];

  return (
    <div className="summary" role="list" aria-label="Board summary">
      {stats.map((s) => (
        <div key={s.k} className={`stat ${s.cls}`} role="listitem">
          <span className="n" suppressHydrationWarning>
            {s.n}
          </span>
          <span className="k">{s.k}</span>
        </div>
      ))}
    </div>
  );
}
