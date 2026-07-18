"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, LineChart as LineChartIcon } from "lucide-react";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/ui/stat-card";
import { cn, brl, num } from "@/lib/utils";

export type PerfRow = {
  id: string;
  date: string; // yyyy-mm-dd
  investment: number;
  leads: number;
  sales: number;
  revenue: number;
};

/* ————— Cálculos (estilo planilha: tudo derivado, nada armazenado) ————— */

type Totals = { investment: number; leads: number; sales: number; revenue: number };

function totalsOf(rows: PerfRow[]): Totals {
  return rows.reduce(
    (t, r) => ({
      investment: t.investment + r.investment,
      leads: t.leads + r.leads,
      sales: t.sales + r.sales,
      revenue: t.revenue + r.revenue,
    }),
    { investment: 0, leads: 0, sales: 0, revenue: 0 }
  );
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function kpisOf(t: Totals) {
  return {
    cac: ratio(t.investment, t.sales),
    cpl: ratio(t.investment, t.leads),
    custoConv: ratio(t.investment, t.sales),
    ticket: ratio(t.revenue, t.sales),
    valorLead: ratio(t.revenue, t.leads),
  };
}

const fmtBrl = (v: number | null) => (v === null ? "—" : brl(v));
const delta = (cur: number | null, prev: number | null) =>
  cur !== null && prev !== null && prev > 0 ? ((cur - prev) / prev) * 100 : undefined;

/* ————— Períodos ————— */

const PERIODS = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "tudo", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const dayMs = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Dashboard de performance por cliente — planilha reativa:
 * a equipe lança Data/Investimento/Leads/Vendas/Receita e todos os KPIs,
 * variações e gráficos recalculam na hora. Alterações salvam sozinhas no banco
 * (com debounce), então o histórico aparece igual em qualquer dispositivo
 * e no Portal do Cliente (somente leitura).
 */
export function PerformanceDashboard({ clientId, editable }: { clientId: string; editable: boolean }) {
  const [rows, setRows] = useState<PerfRow[] | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 29 * dayMs)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: string }>({ state: "idle" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/performance?clientId=${clientId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRows(d.entries as PerfRow[]))
      .catch(() => setRows([]));
  }, [clientId]);

  /* Autosave com debounce: acumula os campos alterados de cada linha e envia 800ms após a última tecla */
  const pending = useRef<Map<string, Partial<PerfRow>>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => {
    const batch = [...pending.current.entries()];
    pending.current.clear();
    if (!batch.length) return;
    setSave({ state: "saving" });
    try {
      for (const [id, patch] of batch) {
        const res = await fetch("/api/performance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        });
        if (!res.ok) throw new Error();
      }
      setSave({ state: "saved", at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
    } catch {
      setSave({ state: "error" });
    }
  }, []);

  /* Fechou/trocou de aba antes do debounce? Envia o que estiver pendente com keepalive. */
  useEffect(() => {
    const flushNow = () => {
      for (const [id, patch] of pending.current) {
        fetch("/api/performance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
          keepalive: true,
        }).catch(() => {});
      }
      pending.current.clear();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("beforeunload", flushNow);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  function edit(id: string, patch: Partial<PerfRow>) {
    setRows((prev) => prev!.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  async function addRow() {
    setAdding(true);
    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, date: iso(new Date()) }),
      });
      if (!res.ok) throw new Error();
      const { entry } = await res.json();
      setRows((prev) => [...(prev ?? []), entry as PerfRow]);
    } catch {
      setSave({ state: "error" });
    } finally {
      setAdding(false);
    }
  }

  async function removeRow(id: string) {
    setRows((prev) => prev!.filter((r) => r.id !== id));
    const res = await fetch(`/api/performance?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) setSave({ state: "error" });
  }

  /* Janela do período selecionado + janela anterior de mesmo tamanho (para a variação %) */
  const { current, previous, rangeLabel } = useMemo(() => {
    const all = rows ?? [];
    if (period === "tudo") return { current: all, previous: [] as PerfRow[], rangeLabel: "todo o histórico" };
    let start: string;
    let end: string;
    if (period === "custom") {
      start = from;
      end = to;
    } else {
      const days = Number(period);
      end = iso(new Date());
      start = iso(new Date(Date.now() - (days - 1) * dayMs));
    }
    const len = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / dayMs) + 1);
    const prevEnd = iso(new Date(new Date(start).getTime() - dayMs));
    const prevStart = iso(new Date(new Date(start).getTime() - len * dayMs));
    return {
      current: all.filter((r) => r.date >= start && r.date <= end),
      previous: all.filter((r) => r.date >= prevStart && r.date <= prevEnd),
      rangeLabel: `${start.split("-").reverse().join("/")} a ${end.split("-").reverse().join("/")}`,
    };
  }, [rows, period, from, to]);

  const k = kpisOf(totalsOf(current));
  const p = kpisOf(totalsOf(previous));

  /* Gráfico: agrega lançamentos do mesmo dia e calcula os índices por data */
  const chartData = useMemo(() => {
    const byDate = new Map<string, Totals>();
    for (const r of current) {
      const cur = byDate.get(r.date) ?? { investment: 0, leads: 0, sales: 0, revenue: 0 };
      cur.investment += r.investment;
      cur.leads += r.leads;
      cur.sales += r.sales;
      cur.revenue += r.revenue;
      byDate.set(r.date, cur);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, t]) => {
        const kk = kpisOf(t);
        return {
          label: new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          cac: kk.cac ?? 0,
          cpl: kk.cpl ?? 0,
          custo: kk.custoConv ?? 0,
        };
      });
  }, [current]);

  const table = useMemo(() => [...(rows ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [rows]);

  if (rows === null) {
    return <div className="card p-8 text-center text-sm text-slate-500">Carregando performance…</div>;
  }

  const inputCls =
    "w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-200 outline-none transition hover:border-line focus:border-brand-500/60 focus:bg-ink-900 focus:ring-2 focus:ring-brand-500/20";

  return (
    <div className="space-y-5">
      {/* Filtro de período — KPIs e gráfico seguem a janela; a tabela mostra tudo */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((pd) => (
          <button
            key={pd.key}
            onClick={() => setPeriod(pd.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              period === pd.key
                ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
            )}
          >
            {pd.label}
          </button>
        ))}
        {period === "custom" && (
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input !w-auto !py-1.5 text-xs" />
            até
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input !w-auto !py-1.5 text-xs" />
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">
          Comparando com o período anterior · {rangeLabel}
        </span>
      </div>

      {/* KPIs com variação vs. período anterior */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="CAC" value={fmtBrl(k.cac)} delta={delta(k.cac, p.cac)} hint="investimento / vendas" accent="brand" lowerIsBetter />
        <StatCard label="CPL" value={fmtBrl(k.cpl)} delta={delta(k.cpl, p.cpl)} hint="investimento / leads" accent="violet" lowerIsBetter />
        <StatCard
          label="Custo por conversão"
          value={fmtBrl(k.custoConv)}
          delta={delta(k.custoConv, p.custoConv)}
          hint="investimento / vendas"
          accent="warn"
          lowerIsBetter
        />
        <StatCard label="Ticket médio" value={fmtBrl(k.ticket)} delta={delta(k.ticket, p.ticket)} hint="receita / vendas" accent="grow" />
        <StatCard label="Valor por lead" value={fmtBrl(k.valorLead)} delta={delta(k.valorLead, p.valorLead)} hint="receita / leads" accent="grow" />
      </div>

      {/* Evolução dos custos */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <LineChartIcon size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-slate-200">Evolução — CAC · CPL · Custo por conversão</h2>
        </div>
        {chartData.length >= 2 ? (
          <TrendChart
            data={chartData}
            series={[
              { key: "cac", label: "CAC" },
              { key: "cpl", label: "CPL" },
              { key: "custo", label: "Custo por conversão" },
            ]}
            format="brl"
          />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">
            Lance pelo menos dois dias de dados no período para ver a evolução.
          </p>
        )}
      </div>

      {/* Planilha de lançamentos */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold text-slate-200">Lançamentos</h2>
          <span
            className={cn(
              "text-xs",
              save.state === "error" ? "font-semibold text-danger" : "text-slate-500"
            )}
          >
            {save.state === "saving" && "Salvando…"}
            {save.state === "saved" && `Salvo automaticamente às ${save.at}`}
            {save.state === "error" && "Erro ao salvar — confira sua conexão e tente de novo."}
          </span>
          {editable && (
            <button onClick={addRow} disabled={adding} className="btn-primary ml-auto !px-3.5 !py-2 text-xs">
              <Plus size={14} /> Adicionar linha
            </button>
          )}
        </div>

        {table.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {editable ? "Nenhum lançamento ainda. Clique em “Adicionar linha” para começar." : "Nenhum dado de performance lançado ainda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2.5 font-medium">Data</th>
                  <th className="px-2 py-2.5 font-medium">Investimento</th>
                  <th className="px-2 py-2.5 font-medium">Leads</th>
                  <th className="px-2 py-2.5 font-medium">Vendas</th>
                  <th className="px-2 py-2.5 font-medium">Receita</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">CAC</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">CPL</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">Ticket</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">R$/Lead</th>
                  {editable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {table.map((r) => {
                  const rk = kpisOf(totalsOf([r]));
                  return (
                    <tr key={r.id} className="border-b border-line/50 transition hover:bg-ink-800/40">
                      {editable ? (
                        <>
                          <td className="px-1 py-1">
                            <input
                              type="date"
                              defaultValue={r.date}
                              onChange={(e) => e.target.value && edit(r.id, { date: e.target.value })}
                              className={cn(inputCls, "min-w-[130px]")}
                            />
                          </td>
                          {(["investment", "leads", "sales", "revenue"] as const).map((field) => (
                            <td key={field} className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                step={field === "leads" || field === "sales" ? 1 : 0.01}
                                defaultValue={r[field] || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  edit(r.id, { [field]: Number.isFinite(v) && v >= 0 ? v : 0 });
                                }}
                                className={cn(inputCls, "min-w-[96px]")}
                              />
                            </td>
                          ))}
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2.5 text-slate-300">{r.date.split("-").reverse().join("/")}</td>
                          <td className="px-2 py-2.5 text-slate-300">{brl(r.investment)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{num(r.leads)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{num(r.sales)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{brl(r.revenue)}</td>
                        </>
                      )}
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.cac)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.cpl)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.ticket)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.valorLead)}</td>
                      {editable && (
                        <td className="px-1 py-1 text-right">
                          <button
                            onClick={() => removeRow(r.id)}
                            title="Excluir linha"
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {editable && table.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-600">
            Edite qualquer célula direto na tabela — KPIs, variações e gráfico recalculam na hora e tudo é salvo
            automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
