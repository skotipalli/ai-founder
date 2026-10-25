import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/lib/types";

export function ChipBadge({ label, tone, style }: { label: string; tone: Tone; style?: CSSProperties }) {
  return (
    <span className={`chip ${tone}`} style={style}>
      {label}
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
