import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { setSetting } from "@/lib/settings";

const schema = z.object({
  /// Percentual de imposto sobre a receita (0–100, aceita decimais ex.: 15.5)
  taxPercent: z.coerce.number().min(0).max(100),
});

/** Atualiza configurações do financeiro (hoje: % de imposto). */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um percentual entre 0 e 100." }, { status: 400 });
  }

  await setSetting("taxPercent", parsed.data.taxPercent);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "settings.tax", entity: "Setting", entityId: `taxPercent=${parsed.data.taxPercent}` },
  });

  return NextResponse.json({ ok: true, taxPercent: parsed.data.taxPercent });
}
