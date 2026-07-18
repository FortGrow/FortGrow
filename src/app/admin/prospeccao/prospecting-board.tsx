"use client";

import { useMemo, useState } from "react";
import { BarsChart } from "@/components/charts/bars-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { type EditableLead } from "./edit-lead-form";

export type LeadDto = EditableLead & {
  stage: string;
  prospectStatus: string;
  firstContactAt: string | null;
  ownerName: string | null;
  createdAt: string;
};

const POTENTIALS = ["Baixo", "Médio", "Alto"] as const;

/** Cor de fundo completa do card por potencial (vermelho / azul / verde). */
const POTENTIAL_STYLE: Record<string, { bg: string; solid: string }> = {
  Baixo: { bg: "linear-gradient(140deg, #dc2626d9, #991b1bcc)", solid: "#dc2626" },
  "Médio": { bg: "linear-gradient(140deg, #0284c7d9, #075985cc)", solid: "#0284c7" },
  Alto: { bg: "linear-gradient(140deg, #059669d9, #047857cc)", solid: "#059669" },
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pctFmt = (v: number) => `${v.toFixed(1)}%`;

const PERIODS = [
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "90 dias" },
  { dias: 0, label: "Tudo" },
];

/** Mini painel da prospecção: métricas de conversão + gráficos por potencial. */
export function ProspectingBoard({ leads }: { leads: LeadDto[] }) {
  const [period, setPeriod] = useState(30);

  // ── Métricas (respeitam o período; filtro de potencial é só dos cards) ──
  const metrics = useMemo(() => {
    const since = period > 0 ? Date.now() - period * 86400000 : 0;
    const inPeriod = leads.filter((l) => new Date(l.createdAt).getTime() >= since);
    const byPot = Object.fromEntries(
      POTENTIALS.map((p) => {
        const of = inPeriod.filter((l) => (l.potential ?? "Médio") === p);
        const closed = of.filter((l) => l.stage === "FECHADO").length;
        return [p, { total: of.length, closed, rate: of.length > 0 ? (closed / of.length) * 100 : 0 }];
      })
    ) as Record<string, { total: number; closed: number; rate: number }>;
    const total = inPeriod.length;
    const closed = inPeriod.filter((l) => l.stage === "FECHADO").length;
    const best = POTENTIALS.reduce<{ p: string; rate: number } | null>((acc, p) => {
      const b = byPot[p];
      if (b.closed === 0) return acc;
      return !acc || b.rate > acc.rate ? { p, rate: b.rate } : acc;
    }, null);

    // Conversões por semana (linha de evolução)
    const weeks = new Map<string, number>();
    for (const l of inPeriod) {
      if (l.stage !== "FECHADO") continue;
      const d = new Date(l.createdAt);
      d.setDate(d.getDate() - d.getDay());
      const k = d.toISOString().slice(0, 10);
      weeks.set(k, (weeks.get(k) ?? 0) + 1);
    }
    const evolution = [...weeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        label: new Date(`${k}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        conversoes: v,
      }));

    return { total, closed, rate: total > 0 ? (closed / total) * 100 : 0, byPot, best, evolution };
  }, [leads, period]);


  const pill = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
        : "bg-ink-800 text-slate-500 hover:text-slate-300"
    }`;

  return (
    <div className="space-y-5">
      {/* Mini painel de conversão */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total de leads</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{metrics.total}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {POTENTIALS.map((p) => `${metrics.byPot[p].total} ${p.toLowerCase()}`).join(" · ")}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Convertidos (fechados)</p>
          <p className="mt-1 text-2xl font-bold text-grow-400">{metrics.closed}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Taxa de conversão</p>
          <p className="mt-1 text-2xl font-bold text-brand-300">{pctFmt(metrics.rate)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">fechados ÷ total de leads</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Melhor categoria</p>
          {metrics.best ? (
            <>
              <p className="mt-1 text-2xl font-bold" style={{ color: POTENTIAL_STYLE[metrics.best.p]?.solid }}>
                {metrics.best.p}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">converte {pctFmt(metrics.best.rate)}</p>
            </>
          ) : (
            <p className="mt-1 text-2xl font-bold text-slate-600">—</p>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-300">Leads × conversões por potencial</h2>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button key={p.dias} onClick={() => setPeriod(p.dias)} className={pill(period === p.dias)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <BarsChart
            data={POTENTIALS.map((p) => ({ label: p, leads: metrics.byPot[p].total, convertidos: metrics.byPot[p].closed }))}
            series={[
              { key: "leads", label: "Leads" },
              { key: "convertidos", label: "Convertidos" },
            ]}
            height={220}
          />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-300">Evolução das conversões (por semana)</h2>
          {metrics.evolution.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Nenhuma conversão no período ainda.</p>
          ) : (
            <TrendChart data={metrics.evolution} series={[{ key: "conversoes", label: "Conversões" }]} height={220} />
          )}
        </div>
      </div>

    </div>
  );
}
