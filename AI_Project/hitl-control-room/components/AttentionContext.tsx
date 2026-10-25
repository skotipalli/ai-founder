"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AttentionItem } from "@/lib/board-data";

interface AttentionState {
  items: AttentionItem[];
  resolved: Record<string, string>; // item id -> label of the button that resolved it
  resolve: (id: string, label: string) => void;
  openBlocking: number;
  openDecisions: number;
}

const Ctx = createContext<AttentionState | null>(null);

export function AttentionProvider({ items, children }: { items: AttentionItem[]; children: ReactNode }) {
  const [resolved, setResolved] = useState<Record<string, string>>({});

  const value = useMemo<AttentionState>(() => {
    const open = items.filter((i) => !(i.id in resolved));
    return {
      items,
      resolved,
      resolve: (id, label) => setResolved((r) => (id in r ? r : { ...r, [id]: label })),
      openBlocking: open.filter((i) => i.severity === "block").length,
      openDecisions: open.filter((i) => i.severity === "attn").length,
    };
  }, [items, resolved]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAttention() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAttention must be used inside <AttentionProvider>");
  return ctx;
}
