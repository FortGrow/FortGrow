import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarsChart } from "@/components/charts/bars-chart";
import { loadMetrics, bucketize, totalsOf, parseDays } from "@/lib/portal-data";
import { kpis } from "@/lib/metrics";
import { analyzeClient } from "@/lib/ai/insights";
import { brl, num, pct } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Flame, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultadosPage({ searchParams }: { searchParams: { days?: string } }) {
  const session = (await getSession())!;
  const days = parseDays(searchParams.days);
  const clientId = session.clientId!;

  const [rows, prevRows, goals, intelligence] = await Promise.all([
    loadMetrics(clientId, days),
    prisma.metricSnapshot.findMany({
      where: {
        clientId,
        date: { gte: new Date(Date.now() - 2 * days * 86400000), lt: new Date(Date.now() - days * 86400000) },
      },
    }),
    prisma.goal.findMany({ where: { clientId, year: new Date().getFullYear() } }),
    analyzeClient(clientId),
  ]);

  const t = totalsOf(rows);
  const prev = totalsOf(prevRows as never[]);
  const delta = (cur: number, before: number) => (before > 0 ? ((cur - before) / before) * 100 : undefined);

  const buckets = bucketize(rows, days);
  const trendLeads = buckets.map((b) => ({ label: b.label, leads: b.leads, conversoes: b.conversions }));
  const trendMoney = buckets.map((b) => ({ label: b.label, investimento: b.spend, receita: b.revenue }));

  const monthlyGoal = goals.find((g) => g.period === "mensal" && g.metric === "leads");
  const yearlyGoal = goals.find((g) => g.period === "anual" && g.metric === "receita");

  return (
    <>
      <PageHeader title="Resultados" subtitle="Desempenho consolidado de todos os canais">
        <PeriodFilter current={days} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Leads gerados" value={num(t.leads)} delta={delta(t.leads, prev.leads)} accent="brand" />
        <StatCard label="Conversões" value={num(t.conversions)} delta={delta(t.conversions, prev.conversions)} accent="grow" />
        <StatCard label="Investimento" value={brl(t.spend)} delta={delta(t.spend, prev.spend)} accent="warn" />
        <StatCard label="Receita" value={brl(t.revenue)} delta={delta(t.revenue, prev.revenue)} accent="grow" />
        <StatCard label="ROI" value={pct(kpis.roi(t))} accent="violet" />
        <StatCard label="ROAS" value={`${kpis.roas(t).toFixed(2)}x`} accent="violet" />
        <StatCard label="CAC" value={brl(kpis.cac(t))} accent="brand" />
        <StatCard label="CPL · CPA" value={`${brl(kpis.cpl(t))} · ${brl(kpis.cpa(t))}`} accent="brand" />
        <StatCard label="Valor por lead" value={brl(kpis.valuePerLead(t))} hint="valor gasto / leads" accent="grow" />
        <StatCard label="Ticket médio" value={brl(kpis.avgTicket(t))} hint="receita / vendas" accent="brand" />
        <StatCard label="Custo por venda" value={brl(kpis.costPerSale(t))} hint="investimento / vendas" accent="warn" />
        <StatCard label="CTR" value={pct(kpis.ctr(t), 2)} accent="brand" />
        <StatCard label="Impressões" value={num(t.impressions)} accent="brand" />
        <StatCard label="Cliques" value={num(t.clicks)} accent="brand" />
        <StatCard label="Alcance · Engajamento" value={`${num(t.reach)} · ${num(t.engagement)}`} accent="violet" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Leads × Conversões</h2>
          <TrendChart
            data={trendLeads}
            series={[
              { key: "leads", label: "Leads" },
              { key: "conversoes", label: "Conversões" },
            ]}
          />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Investimento × Receita</h2>
          <BarsChart
            data={trendMoney}
            series={[
              { key: "investimento", label: "Investimento" },
              { key: "receita", label: "Receita" },
            ]}
            format="brl"
          />
        </div>
      </div>

      {intelligence && intelligence.insights.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-300">
            <Sparkles size={15} className="text-violet" /> Insights do período (últimos 30 dias)
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {intelligence.insights.map((ins, i) => {
              const style =
                ins.severity === "positivo"
                  ? { icon: <CheckCircle2 size={15} />, tone: "text-grow-400 bg-grow-500/10" }
                  : ins.severity === "critico"
                    ? { icon: <Flame size={15} />, tone: "text-danger bg-danger/10" }
                    : { icon: <AlertTriangle size={15} />, tone: "text-warn bg-warn/10" };
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3">
                  <span className={`mt-0.5 rounded-lg p-1.5 ${style.tone}`}>{style.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{ins.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{ins.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(monthlyGoal || yearlyGoal) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {monthlyGoal && (
            <GoalCard
              title="Meta mensal de leads"
              current={t.leads}
              target={Number(monthlyGoal.target)}
              format={num}
            />
          )}
          {yearlyGoal && (
            <GoalCard
              title="Meta anual de receita"
              current={t.revenue}
              target={Number(yearlyGoal.target)}
              format={(v) => brl(v)}
            />
          )}
        </div>
      )}
    </>
  );
}

function GoalCard({
  title,
  current,
  target,
  format,
}: {
  title: string;
  current: number;
  target: number;
  format: (v: number) => string;
}) {
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-300">{title}</span>
        <span className="text-slate-500">
          {format(current)} / {format(target)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-grow-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1.5 text-xs font-semibold text-slate-400">{progress.toFixed(0)}% da meta</p>
    </div>
  );
}
