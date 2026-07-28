import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { allowedClientIds, clientScopeWhere } from "@/lib/client-scope";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl, num, pct } from "@/lib/utils";
import { CrmClientSearch } from "./client-search";

/**
 * Visão global dos CRMs dos clientes.
 *
 * A FortGrow enxerga todos os CRMs, mas com uma trava: colaborador com
 * escopo COMISSIONADOS continua vendo só as empresas dele. O agregado é
 * montado com `groupBy` em vez de carregar os leads de todo mundo — com
 * dezenas de empresas, buscar linha a linha seria o gargalo óbvio.
 */

export const dynamic = "force-dynamic";

export default async function CrmClientesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = (await getSession())!;
  if (!can(session, "crm-clientes", "view")) redirect("/admin");

  const escopo = await allowedClientIds(session);
  const busca = searchParams.q?.trim() ?? "";

  const clients = await prisma.client.findMany({
    where: {
      archivedAt: null,
      ...clientScopeWhere(escopo),
      ...(busca ? { companyName: { contains: busca, mode: "insensitive" } } : {}),
    },
    select: { id: true, companyName: true, logoUrl: true, status: true },
    orderBy: { companyName: "asc" },
  });

  const ids = clients.map((c) => c.id);

  // Agregados por empresa e por tipo de etapa, em duas consultas
  const [porEmpresa, etapas] = await Promise.all([
    prisma.crmLead.groupBy({
      by: ["clientId", "stageId"],
      where: { clientId: { in: ids }, deletedAt: null },
      _count: { _all: true },
      _sum: { estimatedValue: true, wonValue: true },
    }),
    prisma.crmStage.findMany({
      where: { clientId: { in: ids } },
      select: { id: true, kind: true, clientId: true },
    }),
  ]);

  const kindDe = new Map(etapas.map((e) => [e.id, e.kind]));

  type Resumo = { total: number; abertos: number; ganhos: number; perdidos: number; pipeline: number; receita: number };
  const resumo = new Map<string, Resumo>();
  for (const c of clients) {
    resumo.set(c.id, { total: 0, abertos: 0, ganhos: 0, perdidos: 0, pipeline: 0, receita: 0 });
  }
  for (const linha of porEmpresa) {
    // clientId nulo é o CRM da própria FortGrow — não entra nesta lista
    const r = linha.clientId ? resumo.get(linha.clientId) : undefined;
    if (!r) continue;
    const qtd = linha._count._all;
    const kind = kindDe.get(linha.stageId) ?? "ABERTO";
    r.total += qtd;
    if (kind === "GANHO") {
      r.ganhos += qtd;
      r.receita += Number(linha._sum.wonValue ?? linha._sum.estimatedValue ?? 0);
    } else if (kind === "PERDIDO") {
      r.perdidos += qtd;
    } else {
      r.abertos += qtd;
      r.pipeline += Number(linha._sum.estimatedValue ?? 0);
    }
  }

  const geral = [...resumo.values()].reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      abertos: acc.abertos + r.abertos,
      ganhos: acc.ganhos + r.ganhos,
      perdidos: acc.perdidos + r.perdidos,
      pipeline: acc.pipeline + r.pipeline,
      receita: acc.receita + r.receita,
    }),
    { total: 0, abertos: 0, ganhos: 0, perdidos: 0, pipeline: 0, receita: 0 }
  );
  const fechados = geral.ganhos + geral.perdidos;
  const ativos = clients.filter((c) => (resumo.get(c.id)?.total ?? 0) > 0).length;

  return (
    <>
      <PageHeader
        title="CRMs dos clientes"
        subtitle={`${clients.length} empresa(s) · ${ativos} com CRM em uso`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads em todas as empresas" value={num(geral.total)} hint={`${num(geral.abertos)} em aberto`} accent="brand" />
        <StatCard label="Negócios ganhos" value={num(geral.ganhos)} hint={`${num(geral.perdidos)} perdidos`} accent="grow" />
        <StatCard label="Pipeline somado" value={brl(geral.pipeline)} hint="valor em negociação" accent="violet" />
        <StatCard
          label="Conversão média"
          value={fechados > 0 ? pct((geral.ganhos / fechados) * 100) : "—"}
          hint="ganhos ÷ fechados"
          accent="warn"
        />
      </div>

      <CrmClientSearch inicial={busca} />

      <DataTable headers={["Empresa", "Leads", "Em aberto", "Ganhos", "Pipeline", "Receita", "Conversão", ""]}>
        {clients.map((c) => {
          const r = resumo.get(c.id)!;
          const f = r.ganhos + r.perdidos;
          return (
            <tr key={c.id} className="transition hover:bg-ink-800/50">
              <Td>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-brand-300">
                    <Building2 size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-200">{c.companyName}</p>
                    <Badge tone={c.status === "ATIVO" ? "grow" : "slate"}>{c.status}</Badge>
                  </div>
                </div>
              </Td>
              <Td className="text-xs font-semibold">{num(r.total)}</Td>
              <Td className="text-xs">{num(r.abertos)}</Td>
              <Td className="text-xs text-grow-400">{num(r.ganhos)}</Td>
              <Td className="text-xs">{r.pipeline > 0 ? brl(r.pipeline) : "—"}</Td>
              <Td className="text-xs font-semibold text-grow-400">{r.receita > 0 ? brl(r.receita) : "—"}</Td>
              <Td className="text-xs">{f > 0 ? pct((r.ganhos / f) * 100) : "—"}</Td>
              <Td>
                <Link
                  href={`/admin/crm-clientes/${c.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/20 transition hover:bg-brand-500/20"
                >
                  Abrir CRM <ArrowUpRight size={12} />
                </Link>
              </Td>
            </tr>
          );
        })}
      </DataTable>

      {clients.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Nenhuma empresa encontrada{busca && ` para "${busca}"`}.
        </p>
      )}
    </>
  );
}
