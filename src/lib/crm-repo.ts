/**
 * Consultas do CRM do Cliente.
 *
 * Camada única entre as páginas/APIs e o banco. Existe por um motivo de
 * segurança, não de organização: cada função recebe o `CrmContext` e monta
 * o `where` a partir dele, de modo que não há caminho no código que consulte
 * o CRM sem o `clientId` no filtro.
 */
import { prisma } from "./prisma";
import type { CrmContext } from "./crm-tenant";
import { computeScore, daysSince, temperatureOf } from "./crm";

export type LeadFilters = {
  q?: string;
  stageId?: string;
  ownerId?: string;
  source?: string;
  city?: string;
  state?: string;
  tagId?: string;
  temperature?: string;
  from?: string;
  to?: string;
  page?: number;
  per?: number;
};

/** Cláusula de busca/filtro — sempre ancorada no tenant. */
export function leadWhere(ctx: CrmContext, f: LeadFilters) {
  const where: Record<string, unknown> = { clientId: ctx.clientId, deletedAt: null };

  if (f.q?.trim()) {
    const q = f.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { whatsapp: { contains: q } },
      { city: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }
  if (f.stageId) where.stageId = f.stageId;
  if (f.ownerId) where.ownerId = f.ownerId === "SEM" ? null : f.ownerId;
  if (f.source) where.source = f.source;
  if (f.city) where.city = { contains: f.city, mode: "insensitive" };
  if (f.state) where.state = f.state.toUpperCase();
  if (f.temperature) where.temperature = f.temperature;
  if (f.tagId) where.tags = { some: { id: f.tagId } };
  if (f.from || f.to) {
    where.createdAt = {
      ...(f.from ? { gte: new Date(`${f.from}T00:00:00`) } : {}),
      ...(f.to ? { lte: new Date(`${f.to}T23:59:59`) } : {}),
    };
  }
  return where;
}

const LEAD_INCLUDE = {
  stage: { select: { id: true, name: true, color: true, kind: true, position: true } },
  owner: { select: { id: true, name: true } },
  tags: { select: { id: true, name: true, color: true } },
} as const;

export type LeadRow = Awaited<ReturnType<typeof listLeads>>["rows"][number];

/** Página de leads + total, para a lista com paginação. */
export async function listLeads(ctx: CrmContext, f: LeadFilters) {
  const per = Math.min(100, Math.max(5, f.per ?? 25));
  const page = Math.max(1, f.page ?? 1);
  const where = leadWhere(ctx, f);

  const [rows, total] = await Promise.all([
    prisma.crmLead.findMany({
      where,
      include: LEAD_INCLUDE,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * per,
      take: per,
    }),
    prisma.crmLead.count({ where }),
  ]);

  return { rows, total, page, per, pages: Math.max(1, Math.ceil(total / per)) };
}

/** Todos os leads ativos da empresa — usado pelo funil e pelas métricas. */
export async function allLeads(ctx: CrmContext, f: LeadFilters = {}) {
  return prisma.crmLead.findMany({
    where: leadWhere(ctx, f),
    include: LEAD_INCLUDE,
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getLead(ctx: CrmContext, id: string) {
  return prisma.crmLead.findFirst({
    where: { id, clientId: ctx.clientId, deletedAt: null },
    include: {
      ...LEAD_INCLUDE,
      activities: { orderBy: { createdAt: "desc" }, take: 200 },
      tasks: { orderBy: { start: "asc" }, include: { owner: { select: { name: true } } } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });
}

export const stagesOf = (ctx: CrmContext) =>
  prisma.crmStage.findMany({ where: ctx.where, orderBy: { position: "asc" } });

export const membersOf = (ctx: CrmContext) =>
  prisma.crmMember.findMany({ where: ctx.where, orderBy: [{ active: "desc" }, { name: "asc" }] });

export const tagsOf = (ctx: CrmContext) =>
  prisma.crmTag.findMany({ where: ctx.where, orderBy: { name: "asc" } });

/**
 * Recalcula score/temperatura de um lead a partir do estado atual do banco.
 * Chamado depois de toda escrita — o score é derivado, nunca informado.
 */
export async function refreshScore(leadId: string, clientId: string) {
  const lead = await prisma.crmLead.findFirst({
    where: { id: leadId, clientId },
    include: { stage: { select: { kind: true, position: true } } },
  });
  if (!lead) return;

  const stages = await prisma.crmStage.count({ where: { clientId, kind: "ABERTO" } });
  // Etapas ganhas valem 100%; as abertas crescem conforme avançam no funil
  const stageProbability =
    lead.stage.kind === "GANHO" ? 100
    : lead.stage.kind === "PERDIDO" ? 0
    : Math.round(((lead.stage.position + 1) / Math.max(1, stages)) * 90);

  const score = computeScore({
    estimatedValue: Number(lead.estimatedValue),
    stageProbability,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    company: lead.company,
    daysSinceContact: daysSince(lead.lastContactAt ?? lead.createdAt),
  });

  await prisma.crmLead.update({
    where: { id: lead.id },
    data: {
      score,
      temperature: temperatureOf(score),
      // Probabilidade só é derivada quando ninguém definiu na mão
      probability: lead.probability > 0 ? lead.probability : stageProbability,
    },
  });
}

/** Registra um evento na linha do tempo do lead. */
export function logActivity(
  ctx: CrmContext,
  leadId: string,
  type: string,
  content: string,
  meta: Record<string, unknown> = {}
) {
  return prisma.crmActivity.create({
    data: {
      clientId: ctx.clientId,
      leadId,
      type,
      content,
      meta: meta as object,
      authorId: ctx.session.sub,
      authorName: ctx.staff ? `${ctx.session.name} (FortGrow)` : ctx.session.name,
    },
  });
}
