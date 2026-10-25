import { dispatch } from "@/lib/server/runner";
import { addFeed, mutate, now } from "@/lib/server/store";
import { ROLE_IDS, type RoleId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Post a directive and notify the agents it applies to (H5). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown; scope?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const scope = body?.scope;
  if (!text || text.length > 2000) {
    return Response.json({ error: "text must be 1–2000 characters" }, { status: 400 });
  }
  if (scope !== "all" && !ROLE_IDS.includes(scope as RoleId)) {
    return Response.json({ error: "scope must be 'all' or an agent role" }, { status: 400 });
  }

  const targets: RoleId[] = scope === "all" ? [...ROLE_IDS] : [scope as RoleId];
  mutate((s) => {
    s.directive = { text, scope: scope as RoleId | "all", at: now() };
    addFeed(s, { kind: "human", from: "human", to: targets.join(", "), text: `Directive: ${text}` });
  });
  for (const role of targets) {
    dispatch({
      role,
      from: "human",
      depth: 0,
      text: `New directive from the owner, which overrides earlier plans: "${text}". Adjust your current work accordingly and say briefly what changes for you.`,
    });
  }
  return Response.json({ ok: true, notified: targets });
}

export function DELETE() {
  mutate((s) => {
    if (!s.directive) return;
    s.directive = undefined;
    addFeed(s, { kind: "system", from: "system", text: "Directive cleared." });
  });
  return Response.json({ ok: true });
}
