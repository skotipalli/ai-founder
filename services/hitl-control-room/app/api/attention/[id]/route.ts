import { dispatch } from "@/lib/server/runner";
import { addFeed, getState, mutate, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The human answers an item an agent raised (H4). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { option?: unknown; note?: unknown } | null;
  const option = typeof body?.option === "string" ? body.option : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";

  const item = getState().attention.find((a) => a.id === id);
  if (!item) return Response.json({ error: "not found" }, { status: 404 });
  if (item.resolution) return Response.json({ error: "already answered" }, { status: 409 });
  if (!item.options.includes(option)) return Response.json({ error: "unknown option" }, { status: 400 });

  mutate((s) => {
    const it = s.attention.find((a) => a.id === id)!;
    it.resolution = { option, note: note || undefined, at: now() };
    addFeed(s, {
      kind: "human",
      from: "human",
      to: item.raisedBy,
      text: `${option}: ${item.title}${note ? `. ${note}` : ""}`,
    });
  });

  dispatch({
    role: item.raisedBy,
    from: "human",
    depth: 0,
    text: `The owner answered your request "${item.title}": ${option}.${note ? ` Their note: ${note}` : ""} Continue from here.`,
  });

  return Response.json({ ok: true });
}
