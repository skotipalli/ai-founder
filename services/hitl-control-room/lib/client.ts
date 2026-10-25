"use client";

import { useEffect, useState } from "react";
import type { BoardState } from "./types";
import { apiPath } from "./basePath";

/** Live board state over server-sent events, seeded from the server render. */
export function useBoard(initial: BoardState) {
  const [board, setBoard] = useState(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const es = new EventSource(apiPath("/api/board/stream"));
    es.onopen = () => setLive(true);
    es.onmessage = (e) => {
      try {
        setBoard(JSON.parse(e.data) as BoardState);
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => setLive(false); // EventSource reconnects on its own
    return () => es.close();
  }, []);

  return { board, live };
}

export async function postJSON<T = unknown>(
  url: string,
  body?: unknown,
  method: "POST" | "DELETE" = "POST",
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiPath(url), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Couldn't reach the server." };
  }
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ago(iso: string, nowMs: number) {
  const mins = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}
