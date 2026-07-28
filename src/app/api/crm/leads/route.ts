import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { listLeads, logActivity, refreshScore } from "@/lib/crm-repo";
import { invalidResponse } from "@/lib/validation";

/**
 * CRUD de leads do CRM do cliente.
 *
 * Toda operação resolve a empresa por `requireCrm` e só então toca o banco.
 * Nenhuma query aqui roda sem `clientId` no `where` — inclusive as que
 * recebem um id, que passam por `findFirst({ id, clientId })` antes de
 * qualquer update: `where: { id }` sozinho acertaria a linha de outra
 * empresa se o id vazasse.
 */

const dataSchema = z.object({
  name: z.string().min(2).max(120),
  company: z.string().max(160).nullish(),
  jobTitle: z.string().max(80).nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().max(30).nullish(),
  whatsapp: z.string().max(30).nullish(),
  city: z.string().max(80).nullish(),
  state: z.string().max(2).nullish(),
  source: z.string().max(60).nullish(),
  notes: z.string().max(4000).nullish(),
  estimatedValue: z.coerce.number().min(0).max(1e12).optional(),
  stageId: z.string().min(1).optional(),
  ownerId: z.string().nullish(),
  nextContactAt: z.string().nullish(),
  lastContactAt: z.string().nullish(),
  probability: z.coerce.number().min(0).max(100).optional(),
  tagIds: z.array(z.string()).optional(),
});

/** Converte "" e undefined em null; datas ISO em Date. */
function normalize(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (k === "nextContactAt" || k === "lastContactAt") {
      out[k] = v ? new Date(String(v)) : null;
      continue;
    }
    if (k === "state" && typeof v === "string") {
      out[k] = v ? v.toUpperCase() : null;
      continue;
    }
    out[k] = v === "" ? null : v;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;

  const p = req.nextUrl.searchParams;
  const result = await listLeads(ctx, {
    q: p.get("q") ?? undefined,
    stageId: p.get("stageId") ?? undefined,
    ownerId: p.get("ownerId") ?? undefined,
    source: p.get("source") ?? undefined,
    city: p.get("city") ?? undefined,
    state: p.get("state") ?? undefined,
    tagId: p.get("tagId") ?? undefined,
    temperature: p.get("temperature") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    page: Number(p.get("page") ?? 1),
    per: Number(p.get("per") ?? 25),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = dataSchema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  await ensureStages(ctx.clientId);
  const { tagIds, stageId, ownerId, ...rest } = parsed.data;

  // Etapa: a informada (validada no tenant) ou a primeira do funil
  const etapa = stageId
    ? await prisma.crmStage.findFirst({ where: { id: stageId, clientId: ctx.clientId } })
    : await prisma.crmStage.findFirst({ where: ctx.where, orderBy: { position: "asc" } });
  if (!etapa) return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });

  // Responsável precisa ser do mesmo tenant
  const responsavel = ownerId
    ? await prisma.crmMember.findFirst({ where: { id: ownerId, clientId: ctx.clientId } })
    : null;

  const lead = await prisma.crmLead.create({
    data: {
      ...normalize(rest),
      name: rest.name,
      clientId: ctx.clientId,
      stageId: etapa.id,
      ownerId: responsavel?.id ?? null,
      createdById: ctx.session.sub,
      updatedById: ctx.session.sub,
      ...(tagIds?.length
        ? { tags: { connect: await tagsDoTenant(tagIds, ctx.clientId) } }
        : {}),
    },
  });

  await logActivity(ctx, lead.id, "CRIACAO", "Lead cadastrado", { etapa: etapa.name });
  await refreshScore(lead.id, ctx.clientId);

  return NextResponse.json({ lead }, { status: 201 });
}

const patchSchema = dataSchema.partial().extend({
  id: z.string().min(1),
  /// Movimento no Kanban
  order: z.coerce.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, tagIds, stageId, ownerId, ...rest } = parsed.data;

  const atual = await prisma.crmLead.findFirst({
    where: { id, clientId: ctx.clientId, deletedAt: null },
    include: { stage: true },
  });
  if (!atual) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const data: Record<string, unknown> = { ...normalize(rest), updatedById: ctx.session.sub };

  // ── Mudança de etapa: histórico, datas e valor ganho em uma tacada ──
  let etapaNova = null;
  if (stageId && stageId !== atual.stageId) {
    etapaNova = await prisma.crmStage.findFirst({ where: { id: stageId, clientId: ctx.clientId } });
    if (!etapaNova) return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });

    data.stageId = etapaNova.id;
    data.stageSince = new Date();
    data.closedAt = etapaNova.kind === "ABERTO" ? null : new Date();
    // Entrou em etapa de ganho sem valor fechado: assume o valor estimado
    if (etapaNova.kind === "GANHO" && atual.wonValue === null) {
      data.wonValue = atual.estimatedValue;
    }
    if (etapaNova.kind !== "GANHO") data.wonValue = null;
  }

  if (ownerId !== undefined) {
    const responsavel = ownerId
      ? await prisma.crmMember.findFirst({ where: { id: ownerId, clientId: ctx.clientId } })
      : null;
    data.ownerId = responsavel?.id ?? null;
  }
  if (tagIds) {
    data.tags = { set: await tagsDoTenant(tagIds, ctx.clientId) };
  }

  const lead = await prisma.crmLead.update({ where: { id: atual.id }, data });

  if (etapaNova) {
    await logActivity(ctx, lead.id, "ETAPA", `${atual.stage.name} → ${etapaNova.name}`, {
      de: atual.stage.name,
      para: etapaNova.name,
    });
  } else {
    const campos = Object.keys(normalize(rest));
    if (campos.length) {
      await logActivity(ctx, lead.id, "EDICAO", `Dados atualizados (${campos.length} campo(s))`, {
        campos,
      });
    }
  }

  await refreshScore(lead.id, ctx.clientId);
  return NextResponse.json({ lead });
}

/** Exclusão suave — o lead vai para a lixeira e some das listas. */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;
  if (!id) return NextResponse.json({ error: "Informe o lead." }, { status: 400 });

  const atual = await prisma.crmLead.findFirst({ where: { id, clientId: ctx.clientId } });
  if (!atual) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  await prisma.crmLead.update({ where: { id: atual.id }, data: { deletedAt: new Date() } });
  await logActivity(ctx, atual.id, "EXCLUSAO", "Lead movido para a lixeira");

  return NextResponse.json({ ok: true });
}

/** Filtra ids de tag pelo tenant — conectar tag de outra empresa é proibido. */
async function tagsDoTenant(ids: string[], clientId: string) {
  const tags = await prisma.crmTag.findMany({
    where: { id: { in: ids }, clientId },
    select: { id: true },
  });
  return tags.map((t) => ({ id: t.id }));
}
