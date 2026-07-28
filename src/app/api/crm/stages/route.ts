import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { STAGE_KINDS } from "@/lib/crm";
import { invalidResponse } from "@/lib/validation";

/** Etapas do funil — cada empresa desenha o próprio pipeline. */

export async function GET(req: NextRequest) {
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  await ensureStages(ctx.clientId);
  const stages = await prisma.crmStage.findMany({ where: ctx.where, orderBy: { position: "asc" } });
  return NextResponse.json({ stages });
}

const createSchema = z.object({
  name: z.string().min(2).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  kind: z.enum(STAGE_KINDS).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const ultima = await prisma.crmStage.findFirst({ where: ctx.where, orderBy: { position: "desc" } });
  const stage = await prisma.crmStage.create({
    data: {
      clientId: ctx.clientId,
      name: parsed.data.name,
      color: parsed.data.color ?? "#64748b",
      kind: parsed.data.kind ?? "ABERTO",
      position: (ultima?.position ?? -1) + 1,
    },
  });
  return NextResponse.json({ stage }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  kind: z.enum(STAGE_KINDS).optional(),
  /// Reordenação: nova posição na régua do funil
  position: z.coerce.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, ...campos } = parsed.data;
  const atual = await prisma.crmStage.findFirst({ where: { id, clientId: ctx.clientId } });
  if (!atual) return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });

  const stage = await prisma.crmStage.update({ where: { id: atual.id }, data: campos });
  return NextResponse.json({ stage });
}

/**
 * Remove uma etapa. Os leads dela precisam de destino: `moveTo` recebe a
 * etapa que herda os cartões. Sem isso a exclusão em cascata levaria os
 * leads junto — perder negócio por mexer no funil seria inaceitável.
 */
export async function DELETE(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ctx = await requireCrm(p.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const id = p.get("id");
  if (!id) return NextResponse.json({ error: "Informe a etapa." }, { status: 400 });

  const atual = await prisma.crmStage.findFirst({ where: { id, clientId: ctx.clientId } });
  if (!atual) return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });

  const total = await prisma.crmStage.count({ where: ctx.where });
  if (total <= 2) {
    return NextResponse.json({ error: "O funil precisa de pelo menos duas etapas." }, { status: 400 });
  }

  const leads = await prisma.crmLead.count({ where: { clientId: ctx.clientId, stageId: atual.id, deletedAt: null } });
  if (leads > 0) {
    const destinoId = p.get("moveTo");
    const destino = destinoId
      ? await prisma.crmStage.findFirst({ where: { id: destinoId, clientId: ctx.clientId } })
      : null;
    if (!destino || destino.id === atual.id) {
      return NextResponse.json(
        { error: `Esta etapa tem ${leads} lead(s). Escolha para qual etapa eles vão.`, leads },
        { status: 409 }
      );
    }
    await prisma.crmLead.updateMany({
      where: { clientId: ctx.clientId, stageId: atual.id },
      data: { stageId: destino.id },
    });
  }

  await prisma.crmStage.delete({ where: { id: atual.id } });
  return NextResponse.json({ ok: true });
}
