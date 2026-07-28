import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError } from "@/lib/crm-tenant";
import { logActivity, refreshScore } from "@/lib/crm-repo";
import { invalidResponse } from "@/lib/validation";

/**
 * Linha do tempo do lead.
 *
 * A maior parte dos registros nasce sozinha (criação, mudança de etapa,
 * edição, arquivo, atividade concluída). Esta rota é o caminho manual:
 * observação escrita e registro de contato — que, além de aparecer no
 * histórico, atualiza `lastContactAt` e reaquece o Lead Score.
 */

export async function GET(req: NextRequest) {
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;

  const leadId = req.nextUrl.searchParams.get("leadId");
  const activities = await prisma.crmActivity.findMany({
    where: { ...ctx.where, ...(leadId ? { leadId } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Number(req.nextUrl.searchParams.get("take") ?? 50)),
  });
  return NextResponse.json({ activities });
}

const schema = z.object({
  leadId: z.string().min(1),
  type: z.enum(["NOTA", "CONTATO"]).default("NOTA"),
  content: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const lead = await prisma.crmLead.findFirst({
    where: { id: parsed.data.leadId, clientId: ctx.clientId, deletedAt: null },
  });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const activity = await logActivity(ctx, lead.id, parsed.data.type, parsed.data.content);

  // Registrar contato reaquece o lead: mexe na data e, por tabela, no score
  if (parsed.data.type === "CONTATO") {
    await prisma.crmLead.update({ where: { id: lead.id }, data: { lastContactAt: new Date() } });
    await refreshScore(lead.id, ctx.clientId);
  }

  return NextResponse.json({ activity }, { status: 201 });
}
