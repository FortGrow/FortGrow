import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { BarsChart } from "@/components/charts/bars-chart";
import { brl, fullDate } from "@/lib/utils";
import { ltv, paybackMonths } from "@/lib/metrics";
import { CommissionForm } from "./commission-form";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [invoices, expenses, activeClients, adSpend] = await Promise.all([
    prisma.invoice.findMany({
      where: { dueDate: { gte: yearStart } },
      include: { client: { select: { companyName: true } } },
      orderBy: { dueDate: "desc" },
    }),
    prisma.expense.findMany({ where: { date: { gte: yearStart } }, orderBy: { date: "desc" } }),
    prisma.client.findMany({ where: { status: "ATIVO" }, select: { monthlyValue: true, contractMonths: true } }),
    prisma.metricSnapshot.aggregate({ where: { date: { gte: yearStart } }, _sum: { spend: true, conversions: true } }),
  ]);

  const commissionClients = await prisma.client.findMany({
    where: { billingType: "COMISSAO", status: { in: ["ATIVO", "ONBOARDING"] } },
    select: { id: true, companyName: true, commissionBase: true, commissionShare: true },
    orderBy: { companyName: "asc" },
  });

  const received = invoices.filter((i) => i.status === "PAGO").reduce((s, i) => s + Number(i.amount), 0);
  const pending = invoices.filter((i) => i.status === "EM_ABERTO").reduce((s, i) => s + Number(i.amount), 0);
  const overdue = invoices.filter((i) => i.status === "ATRASADO").reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = received - totalExpenses;
  const margin = received > 0 ? (profit / received) * 100 : 0;

  // Métricas de unidade econômica calculadas automaticamente
  const mrr = activeClients.reduce((s, c) => s + Number(c.monthlyValue), 0);
  const avgTicket = activeClients.length ? mrr / activeClients.length : 0;
  const avgMonths = activeClients.length
    ? activeClients.reduce((s, c) => s + (c.contractMonths ?? 12), 0) / activeClients.length
    : 12;
  const totalSpend = Number(adSpend._sum.spend ?? 0);
  const totalConv = Number(adSpend._sum.conversions ?? 0);
  const cac = totalConv > 0 ? totalSpend / totalConv : 0;
  const lifetime = ltv(avgTicket, avgMonths);
  const monthlyMargin = avgTicket * (margin / 100);
  const payback = paybackMonths(cac, monthlyMargin);
  const roi = totalExpenses > 0 ? ((received - totalExpenses) / totalExpenses) * 100 : 0;
  const roas = totalSpend > 0 ? received / totalSpend : 0;

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthly = months.slice(0, now.getMonth() + 1).map((label, m) => ({
    label,
    recebido: invoices
      .filter((i) => i.status === "PAGO" && (i.paidAt ?? i.dueDate).getMonth() === m)
      .reduce((s, i) => s + Number(i.amount), 0),
    despesas: expenses.filter((e) => e.date.getMonth() === m).reduce((s, e) => s + Number(e.amount), 0),
  }));

  return (
    <>
      <PageHeader title="Faturamento" subtitle={`Ano fiscal ${now.getFullYear()} · valores calculados automaticamente`}>
        <CommissionForm
          clients={commissionClients.map((c) => ({
            id: c.id,
            name: c.companyName,
            base: Number(c.commissionBase),
            share: Number(c.commissionShare),
          }))}
        />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Recebido" value={brl(received)} accent="grow" />
        <StatCard label="Em aberto" value={brl(pending)} accent="brand" />
        <StatCard label="Atrasado" value={brl(overdue)} accent={overdue > 0 ? "danger" : "grow"} />
        <StatCard label="Despesas" value={brl(totalExpenses)} accent="warn" />
        <StatCard label="Lucro" value={brl(profit)} hint={`margem ${margin.toFixed(1)}%`} accent={profit >= 0 ? "grow" : "danger"} />
        <StatCard label="ROI" value={`${roi.toFixed(1)}%`} accent="violet" />
        <StatCard label="ROAS" value={`${roas.toFixed(2)}x`} hint={`mídia ${brl(totalSpend)}`} accent="violet" />
        <StatCard
          label="CAC · LTV · Payback"
          value={`${brl(cac)} · ${brl(lifetime)}`}
          hint={payback > 0 ? `payback ~${payback.toFixed(1)} meses` : undefined}
          accent="brand"
        />
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">Recebimentos × Despesas por mês</h2>
        <BarsChart
          data={monthly}
          series={[
            { key: "recebido", label: "Recebido" },
            { key: "despesas", label: "Despesas" },
          ]}
          format="brl"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-300">Mensalidades e cobranças</h2>
          <DataTable headers={["Cliente", "Descrição", "Valor", "Vencimento", "Método", "Status"]}>
            {invoices.slice(0, 15).map((i) => (
              <tr key={i.id} className="transition hover:bg-ink-800/50">
                <Td className="font-medium text-slate-200">{i.client.companyName}</Td>
                <Td>{i.description}</Td>
                <Td>{brl(i.amount)}</Td>
                <Td className="text-slate-500">{fullDate(i.dueDate)}</Td>
                <Td>{i.method ?? "—"}</Td>
                <Td><StatusBadge status={i.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-300">Despesas recentes</h2>
          <DataTable headers={["Descrição", "Categoria", "Valor", "Data"]}>
            {expenses.slice(0, 15).map((e) => (
              <tr key={e.id} className="transition hover:bg-ink-800/50">
                <Td className="font-medium text-slate-200">{e.description}</Td>
                <Td className="capitalize">{e.category}</Td>
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
