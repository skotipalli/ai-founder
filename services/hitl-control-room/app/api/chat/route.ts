import { dispatch } from "@/lib/server/runner";
import { addFeed, mutate } from "@/lib/server/store";
import { ROLE_IDS, type RoleId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENTION = /@(pm|architect|dev|qa|all)\b/gi;

/** Human chat message. Routed to @mentioned agents, or to pm when none (H2). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 4000) {
    return Response.json({ error: "text must be 1–4000 characters" }, { status: 400 });
  }

  const mentioned = [...text.matchAll(MENTION)].map((m) => m[1].toLowerCase());
  const targets: RoleId[] = mentioned.includes("all")
    ? [...ROLE_IDS]
    : mentioned.length
      ? ([...new Set(mentioned)] as RoleId[])
      : ["pm"];

  mutate((s) => addFeed(s, { kind: "human", from: "human", to: targets.join(", "), text }));
  for (const role of targets) dispatch({ role, text, from: "human", depth: 0 });

  return Response.json({ routedTo: targets });
}
