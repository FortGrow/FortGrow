import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarsChart } from "@/components/charts/bars-chart";
import { PeriodSelect } from "@/components/ui/period-select";
import { brl, brlExato, fullDate, num, pct } from "@/lib/utils";
import { ltv, paybackMonths } from "@/lib/metrics";
import { commissionReport, costReport } from "@/lib/commissions";
import { currentMrr, generateSubscriptionCharges } from "@/lib/billing";
import { parsePeriod, MONTHS_PT, MONTHS_SHORT } from "@/lib/period";
import { mesDaFatura } from "@/lib/competencia";
import { getTaxPercent } from "@/lib/settings";
import { CommissionForm } from "./commission-form";
import { TaxPercentForm } from "./tax-form";
import { MarkPaidButton, NewChargeForm } from "./charge-actions";
import { DonutChart } from "@/components/charts/donut-chart";
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

  const [invoices, prevYearPaid, activeClients, adSpend, commissions, costs, commissionClients, recentCosts, allClientsTipo] =
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
        select: { id: true, companyName: true, commissionGrossPercent: true, commissionBase: true, commissionShare: true, closingDay: true },
        orderBy: { companyName: "asc" },
      }),
      prisma.expense.findMany({
        // Recorrentes mensais valem TODO mês, não só no mês em que foram
        // cadastrados; anuais e únicos entram pela data
        where: {
          status: { not: "CANCELADO" },
          OR: [
            { recurring: true, frequency: "mensal" },
            { date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
          ],
        },
        orderBy: [{ recurring: "desc" }, { date: "desc" }],
        take: 20,
      }),
      prisma.client.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          billingType: true,
          monthlyValue: true,
          subscriptions: { where: { status: "ATIVA", autoGenerate: true }, select: { id: true }, take: 1 },
        },
      }),
    ]);

  const [mrrInfo, allActiveClients, taxPercent] = await Promise.all([
    currentMrr(),
    prisma.client.findMany({
      where: { archivedAt: null, status: { in: ["ATIVO", "ONBOARDING"] } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
    getTaxPercent(),
  ]);

  // ── Receita ────────────────────────────────────────────────────────
  const paid = invoices.filter((i) => i.status === "PAGO");
  /* Receita entra no mês da COMPETÊNCIA, não do pagamento — regra única em
     src/lib/competencia.ts, compartilhada com o cálculo de comissões. */
  const monthOf = (i: (typeof invoices)[number]) => mesDaFatura(i, year);
  const revenueByMonth = Array(12).fill(0);
  const clientsByMonth: Set<string>[] = Array.from({ length: 12 }, () => new Set());
  for (const i of paid) {
    revenueByMonth[monthOf(i)] += Number(i.amount);
    clientsByMonth[monthOf(i)].add(i.clientId);
  }

  /* Receita por TIPO de contrato: fixo, fixo + variável (híbrido) e
     variável. Híbrido = cliente por comissão com parte fixa (mensalidade
     replicante ou valor mensal no contrato). */
  type TipoContrato = "fixo" | "hibrido" | "variavel";
  const tipoDoCliente = new Map<string, TipoContrato>();
  for (const c of allClientsTipo) {
    /* Híbrido = comissão COM mensalidade fixa ativa (replicando). O valor
       mensal solto no cadastro não classifica: sem mensalidade ativa, o
       cliente por comissão é VARIÁVEL. */
    const tipo: TipoContrato =
      c.billingType !== "COMISSAO" ? "fixo" : c.subscriptions.length > 0 ? "hibrido" : "variavel";
    tipoDoCliente.set(c.id, tipo);
  }
  const porTipoMes: Record<TipoContrato, number[]> = {
    fixo: Array(12).fill(0),
    hibrido: Array(12).fill(0),
    variavel: Array(12).fill(0),
  };
  const clientesPorTipo: Record<TipoContrato, Set<string>> = {
    fixo: new Set(),
    hibrido: new Set(),
    variavel: new Set(),
  };
  for (const i of paid) {
    const tipo = tipoDoCliente.get(i.clientId) ?? "fixo";
    porTipoMes[tipo][monthOf(i)] += Number(i.amount);
    clientesPorTipo[tipo].add(i.clientId);
  }
  /* O que o mês ainda tem A RECEBER por tipo — cobrança em aberto some dos
     números de pagas e precisa aparecer em algum lugar */
  const aReceberTipoMes: Record<TipoContrato, number> = { fixo: 0, hibrido: 0, variavel: 0 };
  for (const i of invoices) {
    if (i.status !== "EM_ABERTO" && i.status !== "ATRASADO") continue;
    if (monthOf(i) !== m) continue;
    aReceberTipoMes[tipoDoCliente.get(i.clientId) ?? "fixo"] += Number(i.amount);
  }
  const tipoCards = (
    [
      ["fixo", "Fixo"],
      ["hibrido", "Fixo + variável"],
      ["variavel", "Variável"],
    ] as const
  ).map(([key, label]) => ({
    key,
    label,
    mes: porTipoMes[key][m],
    ano: porTipoMes[key].reduce((a, b) => a + b, 0),
    clientes: clientesPorTipo[key].size,
    aReceber: aReceberTipoMes[key],
  }));
  const tipoEvolution = MONTHS_SHORT.map((label, i) => ({
    label,
    fixo: Math.round(porTipoMes.fixo[i]),
    hibrido: Math.round(porTipoMes.hibrido[i]),
    variavel: Math.round(porTipoMes.variavel[i]),
  }));

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
  const monthTax = monthRevenue * (taxPercent / 100);
  const yearTax = yearRevenue * (taxPercent / 100);
  const grossProfit = monthRevenue - monthCosts;
  const netProfit = grossProfit - monthCommissions - monthTax;
  const margin = monthRevenue > 0 ? (netProfit / monthRevenue) * 100 : 0;
  // Margem da empresa no ano inteiro, com as mesmas deduções do mês
  const yearNetProfit = yearRevenue - yearCosts - commissions.yearTotal - yearTax;
  const yearMargin = yearRevenue > 0 ? (yearNetProfit / yearRevenue) * 100 : 0;

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
    impostos: Math.round(revenueByMonth[i] * (taxPercent / 100)),
    lucro: Math.round(revenueByMonth[i] * (1 - taxPercent / 100) - costs.byMonth[i] - commissions.byMonth[i]),
  }));
  const comparison = MONTHS_SHORT.map((label, i) => ({ label, receita: Math.round(revenueByMonth[i]) }));

  // Receita por cliente (pagas no ano) — top 10
  const byClient = new Map<string, number>();
  for (const i of paid) {
    byClient.set(i.client.companyName, (byClient.get(i.client.companyName) ?? 0) + Number(i.amount));
  }
  const sortedClients = [...byClient.entries()].sort(([, a], [, b]) => b - a);
  const revenuePerClient = sortedClients
    .slice(0, 10)
    .map(([label, receita]) => ({ label: label.length > 14 ? `${label.slice(0, 13)}…` : label, receita: Math.round(receita) }));

  // Participação (%) de cada cliente no faturamento — top 9 + "Outros"
  const participationTop = sortedClients.slice(0, 9).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
  const outros = sortedClients.slice(9).reduce((s, [, v]) => s + v, 0);
  const participation = outros > 0 ? [...participationTop, { label: "Outros", value: Math.round(outros * 100) / 100 }] : participationTop;

  // Tabela de cobranças: SÓ o mês selecionado (mesma competência dos cards),
  // com o filtro por status por cima
  const chargeRows = (statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices)
    .filter((i) => monthOf(i) === m)
    .slice(0, 20);
  /* Dias por CALENDÁRIO, não por horário: cobranças gravadas em horas
     diferentes do mesmo dia (mensalidade × comissão) ganham o mesmo selo. */
  const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysTo = (d: Date) => Math.round((inicioDia(d) - inicioDia(new Date())) / 86400000);

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
              closingDay: c.closingDay,
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-300">Resultado de {MONTHS_PT[m]} — visão 360°</h2>
          <TaxPercentForm current={taxPercent} />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Receita do mês" value={brl(monthRevenue)} accent="grow" />
          <StatCard
            label={`Impostos (${taxPercent}%)`}
            value={brl(monthTax)}
            hint={`ano: ${brl(yearTax)}`}
            accent="danger"
          />
          <StatCard label="Custos do mês" value={brl(monthCosts)} hint={`ano: ${brl(yearCosts)}`} accent="warn" />
          <StatCard label="Comissões do mês" value={brl(monthCommissions)} hint={`ano: ${brl(commissions.yearTotal)}`} accent="violet" />
          <StatCard
            label="Lucro líquido"
            value={brl(netProfit)}
            hint={`bruto ${brl(grossProfit)} · ano: ${brl(yearNetProfit)}`}
            accent={netProfit >= 0 ? "grow" : "danger"}
          />
          <StatCard
            label="Margem da empresa"
            value={`${margin.toFixed(1)}%`}
            hint={`quanto sobra de cada R$ faturado no mês · ano: ${yearMargin.toFixed(1)}%`}
            accent={margin >= 20 ? "grow" : margin >= 0 ? "warn" : "danger"}
          />
        </div>
      </div>

      {/* Receita por tipo de contrato: fixo × fixo+variável × variável */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-300">
          Receita por tipo de contrato · {MONTHS_PT[m]}/{year}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tipoCards.map((t) => (
            <StatCard
              key={t.key}
              label={t.label}
              value={brl(t.mes)}
              hint={`ano: ${brl(t.ano)} · ${num(t.clientes)} cliente${t.clientes === 1 ? "" : "s"}${t.aReceber > 0 ? ` · a receber no mês: ${brl(t.aReceber)}` : ""}`}
              accent={t.key === "fixo" ? "brand" : t.key === "hibrido" ? "violet" : "grow"}
            />
          ))}
        </div>
        <div className="card mt-4 p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-300">Comparação mês a mês · {year}</h3>
          <TrendChart
            data={tipoEvolution}
            series={[
              { key: "fixo", label: "Fixo" },
              { key: "hibrido", label: "Fixo + variável" },
              { key: "variavel", label: "Variável" },
            ]}
            format="brl"
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
              { key: "impostos", label: "Impostos" },
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

      {/* Receita e participação por cliente */}
      {revenuePerClient.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-300">Participação no faturamento · {year}</h2>
            <DonutChart data={participation} />
          </div>
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-300">Receita por cliente · {year} (top 10, pagas)</h2>
            <BarsChart data={revenuePerClient} series={[{ key: "receita", label: "Receita" }]} format="brl" />
          </div>
        </div>
      )}

      {/* Tabelas */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-300">Mensalidades e cobranças · {MONTHS_PT[m]}/{year}</h2>
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
                <Td className="font-semibold">{brlExato(i.amount)}</Td>
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
                  {i.status === "PAGO" && <MarkPaidButton invoiceId={i.id} paid />}
                </Td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-300">
            Custos de {MONTHS_PT[m]}/{year} · <a href="/admin/custos" className="text-brand-400 hover:text-brand-300">abrir central de custos →</a>
          </h2>
          <DataTable headers={["Custo", "Categoria", "Valor", "Vencimento"]}>
            {recentCosts.map((e) => (
              <tr key={e.id} className="transition hover:bg-ink-800/50">
                <Td className="font-medium text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    {e.description}
                    {e.recurring && e.frequency === "mensal" && <Badge tone="brand">mensal</Badge>}
                  </span>
                </Td>
                <Td className="capitalize">{e.category.replaceAll("_", " ")}</Td>
                <Td>{brlExato(e.amount)}</Td>
                <Td className="text-slate-500">
                  {e.recurring && e.frequency === "mensal" ? `todo dia ${String(e.date.getDate()).padStart(2, "0")}` : fullDate(e.date)}
                </Td>
              </tr>
            ))}
            {commissions.collaborators.map((c) =>
              c.monthTotal > 0 ? (
                <tr key={`auto-${c.userId}`} className="transition hover:bg-ink-800/50">
                  <Td className="font-medium text-slate-200">
                    <span className="inline-flex items-center gap-1.5">
                      Comissão · {c.userName}
                      <Badge tone="violet">automática</Badge>
                    </span>
                  </Td>
                  <Td>Comissões</Td>
                  <Td>{brlExato(c.monthTotal)}</Td>
                  <Td className="text-slate-500">{MONTHS_PT[m]}/{year}</Td>
                </tr>
              ) : null
            )}
          </DataTable>
        </div>
      </div>
    </>
  );
}
