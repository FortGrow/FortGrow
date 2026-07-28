import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { allowedClientIds, clientScopeWhere } from "@/lib/client-scope";

export const dynamic = "force-dynamic";

/**
 * Dados dos previews flutuantes do menu (hover inteligente).
 * Cada preview exige a permissão do módulo e respeita o escopo de clientes.
 */
export async function GET(req: NextRequest) {
  const m = req.nextUrl.searchParams.get("m");

  if (m === "clientes") {
    const session = await requireStaff("clientes", "view");
    if (isResponse(session)) return session;
    const scope = await allowedClientIds(session);
    const where = { archivedAt: null as null, ...clientScopeWhere(scope) };
    const [total, ativos, latest] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.count({ where: { ...where, status: "ATIVO" } }),
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { companyName: true, status: true },
      }),
    ]);
    return NextResponse.json({
      title: "Clientes",
      stats: [
        { label: "Total", value: String(total) },
        { label: "Ativos", value: String(ativos) },
      ],
      rows: latest.map((c) => ({ label: c.companyName, badge: c.status })),
      footer: "Últimos adicionados",
    });
  }

  if (m === "prospeccao") {
    const session = await requireStaff("prospeccao", "view");
    if (isResponse(session)) return session;
    // Pipeline do CRM Comercial (espaço interno do motor multi-tenant)
    const [porEtapa, etapas] = await Promise.all([
      prisma.crmLead.groupBy({
        by: ["stageId"],
        where: { clientId: null, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.crmStage.findMany({ where: { clientId: null }, select: { id: true, kind: true, position: true } }),
    ]);
    const kindDe = new Map(etapas.map((e) => [e.id, e]));
    let total = 0, novos = 0, negociando = 0, fechados = 0;
    for (const g of porEtapa) {
      const etapa = kindDe.get(g.stageId);
      const n = g._count._all;
      total += n;
      if (etapa?.kind === "GANHO") fechados += n;
      else if (etapa?.kind === "PERDIDO") continue;
      else if ((etapa?.position ?? 0) <= 1) novos += n;
      else negociando += n;
    }
    return NextResponse.json({
      title: "Prospecção",
      stats: [
        { label: "Leads", value: String(total) },
        { label: "Conversão", value: total > 0 ? `${((fechados / total) * 100).toFixed(1)}%` : "—" },
      ],
      rows: [
        { label: "Novos leads", badge: String(novos) },
        { label: "Em negociação", badge: String(negociando) },
        { label: "Fechados", badge: String(fechados) },
      ],
      footer: "Mini pipeline",
    });
  }

  if (m === "tarefas") {
    const session = await requireStaff("tarefas", "view");
    if (isResponse(session)) return session;
    const grouped = await prisma.task.groupBy({ by: ["status"], _count: { _all: true } });
    const count = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
    const overdue = await prisma.task.count({
      where: { status: { not: "CONCLUIDA" }, dueDate: { lt: new Date() } },
    });
    return NextResponse.json({
      title: "Tarefas",
      stats: [
        { label: "Abertas", value: String(count("A_FAZER") + count("EM_ANDAMENTO") + count("EM_REVISAO")) },
        { label: "Atrasadas", value: String(overdue) },
      ],
      rows: [
        { label: "A fazer", badge: String(count("A_FAZER")) },
        { label: "Em andamento", badge: String(count("EM_ANDAMENTO")) },
        { label: "Em revisão", badge: String(count("EM_REVISAO")) },
      ],
      footer: "Quadro atual",
    });
  }

  return NextResponse.json({ error: "Preview indisponível." }, { status: 400 });
}
