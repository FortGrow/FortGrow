import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge } from "@/components/ui/badge";
import { analyzePortfolio, revenueForecast } from "@/lib/ai/insights";
import { generateExecutiveSummary, fallbackSummary } from "@/lib/ai/llm";
import { brl } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

const SEVERITY = {
  positivo: { icon: <CheckCircle2 size={15} />, tone: "text-grow-400 bg-grow-500/10" },
  atencao: { icon: <AlertTriangle size={15} />, tone: "text-warn bg-warn/10" },
  critico: { icon: <Flame size={15} />, tone: "text-danger bg-danger/10" },
} as const;

export default async function IaPage() {
  const [portfolio, forecast] = await Promise.all([analyzePortfolio(), revenueForecast()]);

  const summaries = await Promise.all(
    portfolio.map(async (p) => (await generateExecutiveSummary(p)) ?? fallbackSummary(p))
  );

  const highRisk = portfolio.filter((p) => p.churnLabel === "Alto").length;
  const criticalInsights = portfolio.reduce(
    (s, p) => s + p.insights.filter((i) => i.severity === "critico").length,
    0
  );

  return (
    <>
      <PageHeader
        title="Inteligência"
        subtitle="Análise automática de desempenho, previsão de faturamento e risco de churn"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Forecast (próx. 3 meses)"
          value={brl(forecast.next3Total)}
          hint="regressão sobre recebimentos"
          accent="violet"
        />
        <StatCard
          label="Contas em risco alto"
          value={String(highRisk)}
          hint={`${portfolio.length} contas analisadas`}
          accent={highRisk > 0 ? "danger" : "grow"}
        />
        <StatCard
          label="Alertas críticos"
          value={String(criticalInsights)}
          hint="últimos 30 dias vs. anteriores"
          accent={criticalInsights > 0 ? "warn" : "grow"}
        />
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">Faturamento realizado × previsto</h2>
        <TrendChart
          data={forecast.points as never[]}
          series={[
            { key: "realizado", label: "Realizado" },
            { key: "previsto", label: "Previsto" },
          ]}
          format="brl"
        />
      </div>

      <div className="mt-6 space-y-4">
        {portfolio.map((p, idx) => (
          <div key={p.clientId} className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-slate-100">{p.companyName}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Risco de churn</span>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className={`h-full rounded-full ${
                      p.churnLabel === "Alto" ? "bg-danger" : p.churnLabel === "Médio" ? "bg-warn" : "bg-grow-500"
                    }`}
                    style={{ width: `${Math.max(4, p.churnRisk)}%` }}
                  />
                </div>
                <Badge tone={p.churnLabel === "Alto" ? "danger" : p.churnLabel === "Médio" ? "warn" : "grow"}>
                  {p.churnLabel} · {p.churnRisk}/100
                </Badge>
              </div>
            </div>

            <p className="mb-4 rounded-xl bg-ink-900/60 px-4 py-3 text-sm leading-relaxed text-slate-400">
              {summaries[idx]}
            </p>

            {p.insights.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {p.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3">
                    <span className={`mt-0.5 rounded-lg p-1.5 ${SEVERITY[ins.severity].tone}`}>
                      {SEVERITY[ins.severity].icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{ins.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{ins.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Análises geradas pelo motor de inteligência do FortGrow.
        {process.env.OPENAI_API_KEY
          ? " Resumos executivos redigidos por IA generativa."
          : " Configure OPENAI_API_KEY para resumos executivos redigidos por IA generativa."}
      </p>
    </>
  );
}
