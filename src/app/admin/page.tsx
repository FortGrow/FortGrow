import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { TrendChart } from "@/components/charts/trend-chart";
import { FunnelList } from "@/components/charts/funnel-list";
import { brl, num, pct } from "@/lib/utils";
import { churnRate, ltv } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    clients,
    invoices,
    expenses,
    leadsByStage,
    projects,
    campaignsActive,
    proposalsOpen,
    proposalsWon,
  ] = await Promise.all([
    prisma.client.findMany({ select: { status: true, monthlyValue: true, contractMonths: true } }),
    prisma.invoice.findMany({ where: { dueDate: { gte: yearStart } }, select: { amount: true, status: true, dueDate: true, paidAt: true } }),
    prisma.expense.findMany({ where: { date: { gte: yearStart } }, select: { amount: true, date: true } }),
    prisma.lead.groupBy({ by: ["stage"], _count: true }),
    prisma.project.findMany({ select: { status: true, deadline: true } }),
    prisma.campaign.count({ where: { active: true } }),
    prisma.proposal.count({ where: { status: { in: ["ABERTA", "ENVIADA"] } } }),
    prisma.proposal.count({ where: { status: "ACEITA" } }),
  ]);

  const active = clients.filter((c) => c.status === "ATIVO");
  const inactive = clients.filter((c) => c.status === "INATIVO");
  const mrr = active.reduce((s, c) => s + Number(c.monthlyValue), 0);
  const arr = mrr * 12;
  const avgTicket = active.length ? mrr / active.length : 0;
  const avgMonths = active.length
    ? active.reduce((s, c) => s + (c.contractMonths ?? 12), 0) / active.length
    : 12;
  const lifetimeValue = ltv(avgTicket, avgMonths);
  const churn = churnRate(inactive.length, clients.length);

  const revenueYtd = invoices.filter((i) => i.status === "PAGO").reduce((s, i) => s + Number(i.amount), 0);
  const expensesYtd = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenueYtd - expensesYtd;
  const roiGeral = expensesYtd > 0 ? ((revenueYtd - expensesYtd) / expensesYtd) * 100 : 0;

  // Fluxo de caixa mensal (ano corrente)
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const cashflow = months.slice(0, now.getMonth() + 1).map((label, m) => {
    const rev = invoices
      .filter((i) => i.status === "PAGO" && (i.paidAt ?? i.dueDate).getMonth() === m)
      .reduce((s, i) => s + Number(i.amount), 0);
    const exp = expenses.filter((e) => e.date.getMonth() === m).reduce((s, e) => s + Number(e.amount), 0);
    return { label, receita: rev, despesas: exp };
  });

  const stageCount = (stage: string) => leadsByStage.find((l) => l.stage === stage)?._count ?? 0;
  const funnel = [
    { label: "Leads", value: stageCount("LEAD") + stageCount("CONTATO") + stageCount("DIAGNOSTICO") + stageCount("REUNIAO") + stageCount("PROPOSTA") + stageCount("NEGOCIACAO") + stageCount("FECHADO") },
    { label: "Diagnóstico", value: stageCount("DIAGNOSTICO") + stageCount("REUNIAO") + stageCount("PROPOSTA") + stageCount("NEGOCIACAO") + stageCount("FECHADO") },
    { label: "Proposta", value: stageCount("PROPOSTA") + stageCount("NEGOCIACAO") + stageCount("FECHADO") },
    { label: "Fechado", value: stageCount("FECHADO") },
  ];

  const projectsLate = projects.filter(
    (p) => p.status === "ATRASADO" || (p.deadline && p.deadline < now && p.status !== "CONCLUIDO")
  ).length;
  const projectsActive = projects.filter((p) => p.status === "EM_ANDAMENTO" || p.status === "REVISAO").length;

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Panorama da operação FortGrow em tempo real" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="MRR" value={brl(mrr)} hint="receita recorrente mensal" accent="grow" />
        <StatCard label="ARR" value={brl(arr)} hint="receita recorrente anual" accent="grow" />
        <StatCard label="Clientes ativos" value={num(active.length)} hint={`${inactive.length} inativos`} accent="brand" />
        <StatCard label="Churn" value={pct(churn)} hint="taxa de cancelamento" accent={churn > 5 ? "danger" : "grow"} />
        <StatCard label="Ticket médio" value={brl(avgTicket)} accent="brand" />
        <StatCard label="LTV" value={brl(lifetimeValue)} hint={`~${Math.round(avgMonths)} meses de contrato`} accent="violet" />
        <StatCard label="Lucro (ano)" value={brl(profit)} hint={`receita ${brl(revenueYtd)}`} accent={profit >= 0 ? "grow" : "danger"} />
        <StatCard label="ROI geral" value={pct(roiGeral)} hint="receita vs. despesas" accent="violet" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Fluxo de caixa · {now.getFullYear()}</h2>
          <TrendChart
            data={cashflow}
            series={[
              { key: "receita", label: "Receita" },
              { key: "despesas", label: "Despesas" },
            ]}
            format="brl"
          />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Funil comercial</h2>
          <FunnelList steps={funnel} />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-center">
            <div>
              <p className="text-lg font-bold text-slate-100">{num(proposalsOpen)}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Propostas abertas</p>
            </div>
            <div>
              <p className="text-lg font-bold text-grow-400">{num(proposalsWon)}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Propostas fechadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Projetos ativos" value={num(projectsActive)} accent="brand" />
        <StatCard label="Projetos atrasados" value={num(projectsLate)} accent={projectsLate ? "danger" : "grow"} />
        <StatCard label="Campanhas ativas" value={num(campaignsActive)} accent="violet" />
        <StatCard label="Despesas (ano)" value={brl(expensesYtd)} accent="warn" />
      </div>
    </>
  );
}
