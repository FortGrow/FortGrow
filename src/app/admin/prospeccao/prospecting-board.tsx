"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, User } from "lucide-react";
import { BarsChart } from "@/components/charts/bars-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatusBadge } from "@/components/ui/badge";
import { EditLeadForm, type EditableLead } from "./edit-lead-form";

export type LeadDto = EditableLead & {
  stage: string;
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

/** Prospecção visual: cards coloridos por potencial + métricas de conversão. */
export function ProspectingBoard({ leads: initial }: { leads: LeadDto[] }) {
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<string>("");
  const [period, setPeriod] = useState(30);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

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

  const visible = useMemo(
    () => (filter ? leads.filter((l) => (l.potential ?? "Médio") === filter) : leads),
    [leads, filter]
  );

  async function setPotential(id: string, potential: string) {
    setSaving(id);
    // Tempo real: muda a cor na hora (transição suave via CSS)
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, potential } : l)));
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, potential }),
      });
      if (!res.ok) router.refresh();
    } finally {
      setSaving(null);
    }
  }

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

      {/* Filtro por potencial */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("")} className={pill(filter === "")}>Todos ({leads.length})</button>
        {POTENTIALS.map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={pill(filter === p)}
            style={filter === p ? { color: POTENTIAL_STYLE[p].solid } : undefined}
          >
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: POTENTIAL_STYLE[p].solid }} />
            {p} ({leads.filter((l) => (l.potential ?? "Médio") === p).length})
          </button>
        ))}
      </div>

      {/* Cards coloridos */}
      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">Nenhuma empresa neste filtro.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => {
            const style = POTENTIAL_STYLE[l.potential ?? "Médio"] ?? POTENTIAL_STYLE["Médio"];
            return (
              <div
                key={l.id}
                className="group relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: style.bg }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{l.companyName}</p>
                    <p className="truncate text-xs text-white/80">
                      {[l.contactName, l.segment].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <EditLeadForm lead={l} light />
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-white/85">
                  {(l.city || l.state) && (
                    <p className="flex items-center gap-1.5"><MapPin size={11} /> {l.city}{l.state ? `/${l.state}` : ""}</p>
                  )}
                  {l.ownerName && <p className="flex items-center gap-1.5"><User size={11} /> {l.ownerName}</p>}
                  {Number(l.estimatedValue) > 0 && <p className="font-semibold text-white">{brl(Number(l.estimatedValue))} estimado</p>}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge status={l.stage} />
                  {/* Troca de potencial em tempo real */}
                  <div className="flex overflow-hidden rounded-lg bg-black/25 text-[10px] font-bold">
                    {POTENTIALS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPotential(l.id, p)}
                        disabled={saving === l.id}
                        title={`Potencial ${p}`}
                        className={`px-2 py-1 transition ${
                          (l.potential ?? "Médio") === p ? "bg-white/90 text-ink-900" : "text-white/70 hover:bg-white/15"
                        }`}
                      >
                        {saving === l.id && (l.potential ?? "Médio") === p ? <Loader2 size={10} className="animate-spin" /> : p[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
