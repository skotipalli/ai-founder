import type { CSSProperties, ReactNode } from "react";
import type { Chip } from "@/lib/board-data";

export function ChipBadge({ chip, style }: { chip: Chip; style?: CSSProperties }) {
  return (
    <span className={`chip ${chip.tone}`} style={style}>
      {chip.label}
    </span>
  );
}

/** Wraps @mentions in a highlighted span. */
export function withMentions(text: string): ReactNode[] {
  return text.split(/(@[\w-]+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="mention">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
