import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarsChart } from "@/components/charts/bars-chart";
import { PeriodSelect } from "@/components/ui/period-select";
import { brl, fullDate, num, pct } from "@/lib/utils";
import { ltv, paybackMonths } from "@/lib/metrics";
import { commissionReport, costReport } from "@/lib/commissions";
import { currentMrr, generateSubscriptionCharges } from "@/lib/billing";
import { parsePeriod, MONTHS_PT, MONTHS_SHORT } from "@/lib/period";
import { CommissionForm } from "./commission-form";
import { MarkPaidButton, NewChargeForm } from "./charge-actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { ano?: string; mes?: string; status?: string };
}) {
  const { year, month } = parsePeriod(searchParams);
  const statusFilter = ["PAGO", "EM_ABERTO", "ATRASADO"].includes(searchParams.status ?? "")
    ? searchParams.status
    : undefined;

  // Garante as cobranças do mês corrente antes de calcular qualquer coisa
  await generateSubscriptionCharges().catch(() => 0);
  const m = month - 1;
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const prevYearStart = new Date(year - 1, 0, 1);

  const [invoices, prevYearPaid, activeClients, adSpend, commissions, costs, commissionClients, recentCosts] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { dueDate: { gte: yearStart, lt: yearEnd } },
        include: { client: { select: { companyName: true } } },
        orderBy: { dueDate: "desc" },
      }),
      prisma.invoice.aggregate({
        where: { status: "PAGO", dueDate: { gte: prevYearStart, lt: yearStart } },
        _sum: { amount: true },
      }),
      prisma.client.findMany({ where: { status: "ATIVO" }, select: { monthlyValue: true, contractMonths: true } }),
      prisma.metricSnapshot.aggregate({
        where: { date: { gte: yearStart, lt: yearEnd } },
        _sum: { spend: true, conversions: true },
      }),
      commissionReport(year, month),
      costReport(year, month),
      prisma.client.findMany({
        where: { billingType: "COMISSAO", status: { in: ["ATIVO", "ONBOARDING"] } },
        select: { id: true, companyName: true, commissionBase: true, commissionShare: true },
        orderBy: { companyName: "asc" },
      }),
      prisma.expense.findMany({ where: { status: { not: "CANCELADO" } }, orderBy: { date: "desc" }, take: 10 }),
    ]);

  const [mrrInfo, allActiveClients] = await Promise.all([
    currentMrr(),
    prisma.client.findMany({
      where: { archivedAt: null, status: { in: ["ATIVO", "ONBOARDING"] } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  // ── Receita ────────────────────────────────────────────────────────
  const paid = invoices.filter((i) => i.status === "PAGO");
  const monthOf = (i: (typeof invoices)[number]) => (i.paidAt ?? i.dueDate).getMonth();
  const revenueByMonth = Array(12).fill(0);
  const clientsByMonth: Set<string>[] = Array.from({ length: 12 }, () => new Set());
  for (const i of paid) {
    revenueByMonth[monthOf(i)] += Number(i.amount);
    clientsByMonth[monthOf(i)].add(i.clientId);
  }

  const yearRevenue = revenueByMonth.reduce((a, b) => a + b, 0);
  const monthRevenue = revenueByMonth[m];
  const prevMonthRevenue = m > 0 ? revenueByMonth[m - 1] : 0;
  const monthGrowth = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
  const prevYearRevenue = Number(prevYearPaid._sum.amount ?? 0);
  const yearGrowth = prevYearRevenue > 0 ? ((yearRevenue - prevYearRevenue) / prevYearRevenue) * 100 : 0;

  const mrr = mrrInfo.mrr;
  const monthClients = clientsByMonth[m].size;
  const monthTicket = monthClients > 0 ? monthRevenue / monthClients : 0;

  const pending = invoices.filter((i) => i.status === "EM_ABERTO").reduce((s, i) => s + Number(i.amount), 0);
  const overdue = invoices.filter((i) => i.status === "ATRASADO").reduce((s, i) => s + Number(i.amount), 0);

  // ── Resultado 360° ─────────────────────────────────────────────────
  const monthCosts = costs.monthly;
  const yearCosts = costs.yearly;
  const monthCommissions = commissions.monthTotal;
  const grossProfit = monthRevenue - monthCosts;
  const netProfit = grossProfit - monthCommissions;
  const margin = monthRevenue > 0 ? (netProfit / monthRevenue) * 100 : 0;

  // ── Unidade econômica (ano) ────────────────────────────────────────
  const avgTicket = activeClients.length ? mrr / activeClients.length : 0;
  const avgMonths = activeClients.length
    ? activeClients.reduce((s, c) => s + (c.contractMonths ?? 12), 0) / activeClients.length
    : 12;
  const totalSpend = Number(adSpend._sum.spend ?? 0);
  const totalConv = Number(adSpend._sum.conversions ?? 0);
  const cac = totalConv > 0 ? totalSpend / totalConv : 0;
  const lifetime = ltv(avgTicket, avgMonths);
  const payback = paybackMonths(cac, avgTicket * (margin / 100));

  // ── Gráficos ───────────────────────────────────────────────────────
  const evolution = MONTHS_SHORT.map((label, i) => ({
    label,
    receita: Math.round(revenueByMonth[i]),
    custos: Math.round(costs.byMonth[i]),
    comissoes: Math.round(commissions.byMonth[i]),
    lucro: Math.round(revenueByMonth[i] - costs.byMonth[i] - commissions.byMonth[i]),
  }));
  const comparison = MONTHS_SHORT.map((label, i) => ({ label, receita: Math.round(revenueByMonth[i]) }));

  // Receita por cliente (pagas no ano) — top 10
  const byClient = new Map<string, number>();
  for (const i of paid) {
    byClient.set(i.client.companyName, (byClient.get(i.client.companyName) ?? 0) + Number(i.amount));
  }
  const revenuePerClient = [...byClient.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, receita]) => ({ label: label.length > 14 ? `${label.slice(0, 13)}…` : label, receita: Math.round(receita) }));

  // Tabela de cobranças com filtro por status
  const chargeRows = (statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices).slice(0, 20);
  const daysTo = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);

  return (
    <>
      <PageHeader title="Faturamento" subtitle="Painel financeiro 360° — receitas, custos, comissões e lucro">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelect year={year} month={month} />
          <NewChargeForm clients={allActiveClients.map((c) => ({ id: c.id, name: c.companyName }))} />
          <CommissionForm
            clients={commissionClients.map((c) => ({
              id: c.id,
              name: c.companyName,
              base: Number(c.commissionBase),
              share: Number(c.commissionShare),
            }))}
          />
        </div>
      </PageHeader>

      {/* Dashboard de faturamento */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Receita recorrente (MRR)"
          value={brl(mrr)}
          hint={`${mrrInfo.withSubs} c/ mensalidade${mrrInfo.legacy > 0 ? ` + ${mrrInfo.legacy} pelo contrato` : ""}`}
          accent="grow"
        />
        <StatCard
          label={`Faturamento de ${MONTHS_PT[m]}`}
          value={brl(monthRevenue)}
          delta={prevMonthRevenue > 0 ? monthGrowth : undefined}
          hint="vs. mês anterior"
          accent="grow"
        />
        <StatCard
          label={`Faturamento anual (${year})`}
          value={brl(yearRevenue)}
          delta={prevYearRevenue > 0 ? yearGrowth : undefined}
          hint={prevYearRevenue > 0 ? `vs. ${year - 1}` : "recebido no ano"}
          accent="brand"
        />
        <StatCard label="Receita anual projetada (ARR)" value={brl(mrr * 12)} hint="MRR × 12" accent="violet" />
      </div>

      {/* Visão do mês selecionado */}
      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">
          {MONTHS_PT[m]} de {year} em detalhe
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total faturado no mês" value={brl(monthRevenue)} accent="grow" />
          <StatCard label="Clientes faturados" value={num(monthClients)} accent="brand" />
          <StatCard label="Ticket médio do mês" value={brl(monthTicket)} accent="violet" />
          <StatCard label="Em aberto · Atrasado" value={`${brl(pending)} · ${brl(overdue)}`} accent={overdue > 0 ? "danger" : "warn"} />
        </div>
      </div>

      {/* Resultado 360° do mês */}
      <div className="card mt-4 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">Resultado de {MONTHS_PT[m]} — visão 360°</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Receita do mês" value={brl(monthRevenue)} accent="grow" />
          <StatCard label="Custos do mês" value={brl(monthCosts)} hint={`ano: ${brl(yearCosts)}`} accent="warn" />
          <StatCard label="Comissões do mês" value={brl(monthCommissions)} hint={`ano: ${brl(commissions.yearTotal)}`} accent="violet" />
          <StatCard
            label="Lucro líquido"
            value={brl(netProfit)}
            hint={`bruto ${brl(grossProfit)} · margem ${margin.toFixed(1)}%`}
            accent={netProfit >= 0 ? "grow" : "danger"}
          />
        </div>
      </div>

      {/* Gráficos de evolução */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Evolução 360° · {year}</h2>
          <TrendChart
            data={evolution}
            series={[
              { key: "receita", label: "Receita" },
              { key: "custos", label: "Custos" },
              { key: "comissoes", label: "Comissões" },
              { key: "lucro", label: "Lucro" },
            ]}
            format="brl"
          />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Faturamento mês a mês · {year}</h2>
          <BarsChart data={comparison} series={[{ key: "receita", label: "Receita" }]} format="brl" />
          <p className="mt-3 text-center text-xs text-slate-500">
            Receita total do ano: <span className="font-bold text-slate-300">{brl(yearRevenue)}</span>
            {prevYearRevenue > 0 && (
              <>
                {" "}· crescimento anual:{" "}
                <span className={`font-bold ${yearGrowth >= 0 ? "text-grow-400" : "text-danger"}`}>
                  {pct(yearGrowth)}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Unidade econômica */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ticket médio (carteira)" value={brl(avgTicket)} accent="brand" />
        <StatCard label="CAC" value={brl(cac)} hint="mídia / conversões" accent="warn" />
        <StatCard label="LTV" value={brl(lifetime)} hint={`~${Math.round(avgMonths)} meses`} accent="violet" />
        <StatCard label="Payback" value={payback > 0 ? `${payback.toFixed(1)} meses` : "—"} accent="grow" />
      </div>

      {/* Receita por cliente */}
      {revenuePerClient.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Receita por cliente · {year} (top 10, pagas)</h2>
          <BarsChart data={revenuePerClient} series={[{ key: "receita", label: "Receita" }]} format="brl" />
        </div>
      )}

      {/* Tabelas */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-300">Mensalidades e cobranças · {year}</h2>
            <div className="flex gap-1.5">
              {[
                [undefined, "Todas"],
                ["PAGO", "Pagas"],
                ["EM_ABERTO", "Pendentes"],
                ["ATRASADO", "Atrasadas"],
              ].map(([value, label]) => (
                <Link
                  key={label}
                  href={`/admin/financeiro?ano=${year}&mes=${month}${value ? `&status=${value}` : ""}`}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    statusFilter === value || (!statusFilter && !value)
                      ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                      : "bg-ink-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <DataTable headers={["Cliente", "Valor", "Vencimento", "Status", ""]}>
            {chargeRows.map((i) => (
              <tr key={i.id} className="transition hover:bg-ink-800/50">
                <Td>
                  <p className="font-medium text-slate-200">{i.client.companyName}</p>
                  <p className="max-w-52 truncate text-xs text-slate-500">{i.description}</p>
                </Td>
                <Td className="font-semibold">{brl(i.amount)}</Td>
                <Td className="text-slate-500">{fullDate(i.dueDate)}</Td>
                <Td>
                  <span className="flex items-center gap-1.5">
                    <StatusBadge status={i.status} />
                    {i.status === "EM_ABERTO" && daysTo(i.dueDate) >= 0 && daysTo(i.dueDate) <= 5 && (
                      <Badge tone="warn">{daysTo(i.dueDate) === 0 ? "vence hoje" : `vence em ${daysTo(i.dueDate)}d`}</Badge>
                    )}
                  </span>
                </Td>
                <Td>
                  {(i.status === "EM_ABERTO" || i.status === "ATRASADO") && <MarkPaidButton invoiceId={i.id} />}
                </Td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-300">
            Custos recentes · <a href="/admin/custos" className="text-brand-400 hover:text-brand-300">abrir central de custos →</a>
          </h2>
          <DataTable headers={["Custo", "Categoria", "Valor", "Vencimento"]}>
            {recentCosts.map((e) => (
              <tr key={e.id} className="transition hover:bg-ink-800/50">
                <Td className="font-medium text-slate-200">{e.description}</Td>
                <Td className="capitalize">{e.category.replaceAll("_", " ")}</Td>
                <Td>{brl(e.amount)}</Td>
                <Td className="text-slate-500">{fullDate(e.date)}</Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>
    </>
  );
}
