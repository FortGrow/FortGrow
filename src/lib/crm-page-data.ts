/**
 * Dados que as páginas do CRM carregam.
 *
 * Portal e painel da FortGrow renderizam exatamente as mesmas telas; a
 * diferença é só de onde vem o `clientId`. Concentrar o carregamento aqui
 * garante que os dois lados vejam os mesmos números — e que o filtro de
 * tenant seja aplicado uma vez, no lugar certo, em vez de ser reescrito em
 * cada página.
 */
import { prisma } from "./prisma";
import type { CrmContext } from "./crm-tenant";
import { computeMetrics } from "./crm-metrics";
import type { LeadDto, MemberDto, StageDto, TagDto } from "@/components/crm/types";

const nOf = (v: unknown) => Number(v ?? 0);
const isoOf = (d: Date | null) => (d ? d.toISOString() : null);

/** Etapas, equipe e etiquetas — a base compartilhada por quase toda tela. */
export async function loadBase(ctx: CrmContext) {
  const [stages, members, tags, sourcesRaw, logins] = await Promise.all([
    prisma.crmStage.findMany({ where: ctx.where, orderBy: { position: "asc" } }),
    prisma.crmMember.findMany({ where: ctx.where, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.crmTag.findMany({
      where: ctx.where,
      orderBy: { name: "asc" },
      include: { _count: { select: { leads: true } } },
    }),
    prisma.crmLead.findMany({
      where: { ...ctx.where, deletedAt: null, source: { not: null } },
      select: { source: true },
      distinct: ["source"],
      take: 60,
    }),
    prisma.user.findMany({
      where: { clientId: ctx.clientId, role: "CLIENTE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    stages: stages.map(
      (s): StageDto => ({ id: s.id, name: s.name, color: s.color, kind: s.kind, position: s.position })
    ),
    members: members.map(
      (m): MemberDto => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        department: m.department,
        goal: nOf(m.goal),
        active: m.active,
        userId: m.userId,
      })
    ),
    tags: tags.map((t): TagDto => ({ id: t.id, name: t.name, color: t.color, count: t._count.leads })),
    sources: sourcesRaw.map((s) => s.source!).filter(Boolean).sort(),
    logins,
  };
}

/** Métricas do painel — leads ativos + etapas, calculados na hora. */
export async function loadMetrics(ctx: CrmContext) {
  const [leads, stages] = await Promise.all([
    prisma.crmLead.findMany({
      where: { ...ctx.where, deletedAt: null },
      select: {
        source: true,
        estimatedValue: true,
        wonValue: true,
        createdAt: true,
        closedAt: true,
        lastContactAt: true,
        nextContactAt: true,
        score: true,
        stage: { select: { id: true, name: true, color: true, kind: true, position: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.crmStage.findMany({ where: ctx.where, orderBy: { position: "asc" } }),
  ]);

  return computeMetrics(leads, stages);
}

/** Leads do funil, já em DTO serializável. */
export async function loadFunnelLeads(ctx: CrmContext): Promise<LeadDto[]> {
  const leads = await prisma.crmLead.findMany({
    where: { ...ctx.where, deletedAt: null },
    include: {
      stage: { select: { id: true, name: true, color: true, kind: true } },
      owner: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    take: 2000,
  });
  return leads.map(toLeadDto);
}

/** Desempenho por membro da equipe: em aberto, ganhos e receita. */
export async function loadTeamPerformance(ctx: CrmContext) {
  const leads = await prisma.crmLead.findMany({
    where: { ...ctx.where, deletedAt: null, ownerId: { not: null } },
    select: {
      ownerId: true,
      estimatedValue: true,
      wonValue: true,
      stage: { select: { kind: true } },
    },
  });

  const out: Record<string, { ganhos: number; receita: number; abertos: number }> = {};
  for (const l of leads) {
    const bucket = (out[l.ownerId!] ??= { ganhos: 0, receita: 0, abertos: 0 });
    if (l.stage.kind === "GANHO") {
      bucket.ganhos++;
      bucket.receita += l.wonValue !== null ? nOf(l.wonValue) : nOf(l.estimatedValue);
    } else if (l.stage.kind === "ABERTO") {
      bucket.abertos++;
    }
  }
  return out;
}

/** Nomes dos leads para os seletores da agenda (leve, sem carregar tudo). */
export function loadLeadOptions(ctx: CrmContext) {
  return prisma.crmLead.findMany({
    where: { ...ctx.where, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
}

type LeadComRelacoes = Awaited<ReturnType<typeof loadFunnelLeads>> extends (infer _T)[]
  ? Parameters<typeof toLeadDto>[0]
  : never;

export function toLeadDto(l: {
  id: string;
  name: string;
  company: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  notes: string | null;
  stageId: string;
  estimatedValue: unknown;
  wonValue: unknown;
  ownerId: string | null;
  score: number;
  temperature: string;
  probability: number;
  createdAt: Date;
  lastContactAt: Date | null;
  nextContactAt: Date | null;
  closedAt: Date | null;
  stage: { id: string; name: string; color: string; kind: string };
  owner: { id: string; name: string } | null;
  tags: { id: string; name: string; color: string }[];
}): LeadDto {
  return {
    id: l.id,
    name: l.name,
    company: l.company,
    jobTitle: l.jobTitle,
    email: l.email,
    phone: l.phone,
    whatsapp: l.whatsapp,
    city: l.city,
    state: l.state,
    source: l.source,
    notes: l.notes,
    stageId: l.stageId,
    stageName: l.stage.name,
    stageColor: l.stage.color,
    stageKind: l.stage.kind,
    estimatedValue: nOf(l.estimatedValue),
    wonValue: l.wonValue === null || l.wonValue === undefined ? null : nOf(l.wonValue),
    ownerId: l.ownerId,
    ownerName: l.owner?.name ?? null,
    tags: l.tags,
    score: l.score,
    temperature: l.temperature,
    probability: l.probability,
    createdAt: l.createdAt.toISOString(),
    lastContactAt: isoOf(l.lastContactAt),
    nextContactAt: isoOf(l.nextContactAt),
    closedAt: isoOf(l.closedAt),
  };
}

export type { LeadComRelacoes };
