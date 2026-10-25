import { onChange, snapshot } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-sent events: pushes the full board on every change (H6). */
export function GET(req: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let pending = false;
      const send = () => {
        // Coalesce bursts of changes (e.g. a tool run) into one frame.
        if (pending) return;
        pending = true;
        queueMicrotask(() => {
          pending = false;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot())}\n\n`));
          } catch {
            cleanup();
          }
        });
      };

      send();
      const off = onChange(send);
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 15_000);

      cleanup = () => {
        off();
        clearInterval(ping);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
