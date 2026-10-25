import { resetAgent } from "@/lib/server/runner";
import { ROLE_IDS, type RoleId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Clear an agent's error state (H10). */
export async function POST(_req: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!ROLE_IDS.includes(role as RoleId)) return Response.json({ error: "unknown role" }, { status: 404 });
  resetAgent(role as RoleId);
  return Response.json({ ok: true });
}
