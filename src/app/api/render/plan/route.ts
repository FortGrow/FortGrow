import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { setSetting } from "@/lib/settings";
import { WORKSPACE_PLANS } from "@/lib/render-api";
import { invalidResponse } from "@/lib/validation";

/** Plano de workspace contratado no Render (define a franquia de banda). */
const schema = z.object({
  plan: z.enum(Object.keys(WORKSPACE_PLANS) as [string, ...string[]]),
  bandwidthGB: z.coerce.number().min(0).max(1_000_000).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireStaff("hospedagem", "edit");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  await setSetting("renderPlan", parsed.data.plan);
  if (parsed.data.plan === "custom") {
    await setSetting("renderBandwidthGB", parsed.data.bandwidthGB ?? 0);
  }

  return NextResponse.json({ ok: true });
}
