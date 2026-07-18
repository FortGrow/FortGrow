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
    const grouped = await prisma.lead.groupBy({ by: ["stage"], _count: { _all: true } });
    const count = (s: string) => grouped.find((g) => g.stage === s)?._count._all ?? 0;
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
    const closed = count("FECHADO");
    return NextResponse.json({
      title: "Prospecção",
      stats: [
        { label: "Leads", value: String(total) },
        { label: "Conversão", value: total > 0 ? `${((closed / total) * 100).toFixed(1)}%` : "—" },
      ],
      rows: [
        { label: "Novos leads", badge: String(count("LEAD") + count("CONTATO")) },
        { label: "Em negociação", badge: String(count("DIAGNOSTICO") + count("REUNIAO") + count("PROPOSTA") + count("NEGOCIACAO")) },
        { label: "Fechados", badge: String(closed) },
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
