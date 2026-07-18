"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, LineChart as LineChartIcon, SlidersHorizontal, UserRound } from "lucide-react";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/ui/stat-card";
import { InstagramPanel } from "@/components/performance/instagram-panel";
import { SalesModal } from "@/components/performance/sales-modal";
import { cn, brl, num } from "@/lib/utils";

export type PerfRow = {
  id: string;
  date: string; // yyyy-mm-dd
  investment: number;
  leads: number;
  sales: number;
  /** Receita bruta (valor total vendido) */
  revenue: number;
  /** Overrides da base de cálculo; null = usa o padrão do cliente */
  convPercent: number | null;
  commissionPercent: number | null;
  /** Origem dos leads (chave de SOURCES) */
  source: string;
  /** Vendas detalhadas (quem vendeu etc.); quando existem, Vendas e Receita bruta vêm delas */
  salesDetails: SaleDetail[];
};

export type SaleDetail = {
  id: string;
  sellerName: string;
  buyer: string | null;
  amount: number;
  notes: string | null;
};

/** Origens de lead disponíveis no dropdown e nos filtros */
export const SOURCES = [
  { key: "INDICACAO", label: "Indicação" },
  { key: "TRAFEGO_PAGO", label: "Tráfego Pago" },
  { key: "ORGANICO", label: "Orgânico" },
  { key: "SOCIAL", label: "Social" },
  { key: "OUTRO", label: "Outro" },
] as const;
const sourceLabel = (key: string) => SOURCES.find((s) => s.key === key)?.label ?? key;

export type PerfConfig = { convPercent: number; commissionPercent: number };

/* ————— Cálculos (estilo planilha: tudo derivado, nada armazenado) ————— */

type Totals = { investment: number; leads: number; sales: number; revenue: number; real: number };

/** Receita Real da linha = bruta × % conversão real × % comissão (override ou padrão) */
function realOf(r: PerfRow, cfg: PerfConfig) {
  const conv = r.convPercent ?? cfg.convPercent;
  const comm = r.commissionPercent ?? cfg.commissionPercent;
  return r.revenue * (conv / 100) * (comm / 100);
}

function totalsOf(rows: PerfRow[], cfg: PerfConfig): Totals {
  return rows.reduce(
    (t, r) => ({
      investment: t.investment + r.investment,
      leads: t.leads + r.leads,
      sales: t.sales + r.sales,
      revenue: t.revenue + r.revenue,
      real: t.real + realOf(r, cfg),
    }),
    { investment: 0, leads: 0, sales: 0, revenue: 0, real: 0 }
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
    real: t.real,
    // ROI sobre a receita REAL (não a bruta), em %
    roi: t.investment > 0 ? ((t.real - t.investment) / t.investment) * 100 : null,
  };
}

const fmtBrl = (v: number | null) => (v === null ? "—" : brl(v));
const fmtPct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
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
 * a equipe lança Data/Investimento/Leads/Vendas/Receita bruta e o sistema
 * deriva CAC, CPL, ticket, valor por lead, Receita Real (bruta × % conversão
 * real × % comissão) e ROI sobre a receita real. A base de cálculo é
 * configurável por cliente, com override opcional por linha. Tudo salva
 * sozinho no banco (debounce + keepalive), então o histórico aparece igual
 * em qualquer dispositivo e no Portal do Cliente (somente leitura).
 */
export function PerformanceDashboard({ clientId, editable }: { clientId: string; editable: boolean }) {
  const [rows, setRows] = useState<PerfRow[] | null>(null);
  const [cfg, setCfg] = useState<PerfConfig>({ convPercent: 100, commissionPercent: 100 });
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [source, setSource] = useState<string>("TODAS");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 29 * dayMs)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: string }>({ state: "idle" });
  const [adding, setAdding] = useState(false);
  /* Modal de vendas detalhadas + contador de versão por linha: os inputs da
     tabela são não-controlados, então quando o modal re-sincroniza Vendas e
     Receita bruta a linha precisa remontar para exibir os novos valores. */
  const [salesEntryId, setSalesEntryId] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState<Record<string, number>>({});

  function applyEntryUpdate(entry: PerfRow) {
    setRows((prev) => prev!.map((r) => (r.id === entry.id ? entry : r)));
    setRowVersion((v) => ({ ...v, [entry.id]: (v[entry.id] ?? 0) + 1 }));
  }

  useEffect(() => {
    fetch(`/api/performance?clientId=${clientId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setRows(d.entries as PerfRow[]);
        setCfg(d.config as PerfConfig);
      })
      .catch(() => setRows([]));
  }, [clientId]);

  /* Autosave com debounce: linhas alteradas + config, enviados 800ms após a última tecla */
  const pending = useRef<Map<string, Partial<PerfRow>>>(new Map());
  const pendingCfg = useRef<Partial<PerfConfig> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => {
    const batch = [...pending.current.entries()];
    const cfgPatch = pendingCfg.current;
    pending.current.clear();
    pendingCfg.current = null;
    if (!batch.length && !cfgPatch) return;
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
      if (cfgPatch) {
        const res = await fetch("/api/performance/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, ...cfgPatch }),
        });
        if (!res.ok) throw new Error();
      }
      setSave({ state: "saved", at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
    } catch {
      setSave({ state: "error" });
    }
  }, [clientId]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }, [flush]);

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
      if (pendingCfg.current) {
        fetch("/api/performance/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, ...pendingCfg.current }),
          keepalive: true,
        }).catch(() => {});
        pendingCfg.current = null;
      }
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
  }, [clientId]);

  function edit(id: string, patch: Partial<PerfRow>) {
    setRows((prev) => prev!.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    schedule();
  }

  function editCfg(patch: Partial<PerfConfig>) {
    setCfg((prev) => ({ ...prev, ...patch }));
    pendingCfg.current = { ...pendingCfg.current, ...patch };
    schedule();
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

  /* Janela do período selecionado + janela anterior de mesmo tamanho (para a variação %).
     currentAll ignora o filtro de origem (usado no comparativo por origem);
     current/previous respeitam origem e alimentam KPIs e gráficos. */
  const { current, currentAll, previous, rangeLabel, range } = useMemo(() => {
    const all = rows ?? [];
    const bySource = (list: PerfRow[]) => (source === "TODAS" ? list : list.filter((r) => r.source === source));
    if (period === "tudo") {
      return {
        current: bySource(all),
        currentAll: all,
        previous: [] as PerfRow[],
        rangeLabel: "todo o histórico",
        range: null as { start: string; end: string } | null,
      };
    }
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
    const windowed = all.filter((r) => r.date >= start && r.date <= end);
    return {
      current: bySource(windowed),
      currentAll: windowed,
      previous: bySource(all.filter((r) => r.date >= prevStart && r.date <= prevEnd)),
      rangeLabel: `${start.split("-").reverse().join("/")} a ${end.split("-").reverse().join("/")}`,
      range: { start, end },
    };
  }, [rows, period, from, to, source]);

  const t = totalsOf(current, cfg);
  const pt = totalsOf(previous, cfg);
  const k = kpisOf(t);
  const p = kpisOf(pt);

  /* Gráficos: agrega lançamentos do mesmo dia e calcula os índices por data */
  const chartData = useMemo(() => {
    const byDate = new Map<string, PerfRow[]>();
    for (const r of current) {
      byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayRows]) => {
        const kk = kpisOf(totalsOf(dayRows, cfg));
        return {
          label: new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          cac: kk.cac ?? 0,
          cpl: kk.cpl ?? 0,
          custo: kk.custoConv ?? 0,
          real: kk.real,
          roi: kk.roi ?? 0,
        };
      });
  }, [current, cfg]);

  /* Tabela: mostra todo o histórico, respeitando só o filtro de origem */
  const table = useMemo(
    () =>
      [...(rows ?? [])]
        .filter((r) => source === "TODAS" || r.source === source)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [rows, source]
  );

  /* Comparativo por origem no período (independe do filtro de origem ativo) */
  const bySource = useMemo(
    () =>
      SOURCES.map((s) => {
        const srcRows = currentAll.filter((r) => r.source === s.key);
        return { ...s, count: srcRows.length, k: kpisOf(totalsOf(srcRows, cfg)), t: totalsOf(srcRows, cfg) };
      }).filter((s) => s.count > 0),
    [currentAll, cfg]
  );

  if (rows === null) {
    return <div className="card p-8 text-center text-sm text-slate-500">Carregando performance…</div>;
  }

  const inputCls =
    "w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-200 outline-none transition hover:border-line focus:border-brand-500/60 focus:bg-ink-900 focus:ring-2 focus:ring-brand-500/20";

  /* Exemplo vivo da base de cálculo com os números do período atual */
  const baseExample = t.revenue * (cfg.convPercent / 100);

  return (
    <div className="space-y-5">
      {/* Filtro de período — KPIs e gráficos seguem a janela; a tabela mostra tudo */}
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

      {/* Filtro por origem de lead — KPIs, gráficos e tabela seguem a seleção */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Origem:</span>
        {[{ key: "TODAS", label: "Todas" }, ...SOURCES].map((s) => (
          <button
            key={s.key}
            onClick={() => setSource(s.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              source === s.key
                ? "border-grow-500/40 bg-grow-500/15 text-grow-400"
                : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* KPIs com variação vs. período anterior */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
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
        <StatCard label="Ticket médio" value={fmtBrl(k.ticket)} delta={delta(k.ticket, p.ticket)} hint="receita bruta / vendas" accent="grow" />
        <StatCard label="Valor por lead" value={fmtBrl(k.valorLead)} delta={delta(k.valorLead, p.valorLead)} hint="receita bruta / leads" accent="grow" />
        <StatCard
          label="Receita bruta"
          value={brl(t.revenue)}
          delta={delta(t.revenue, pt.revenue)}
          hint="valor total vendido"
          accent="brand"
        />
        <StatCard
          label="Receita real"
          value={brl(k.real)}
          delta={delta(k.real, p.real)}
          hint={`bruta × ${cfg.convPercent}% × ${cfg.commissionPercent}%`}
          accent="grow"
        />
        <StatCard
          label="ROI"
          value={fmtPct(k.roi)}
          delta={delta(k.roi, p.roi)}
          hint="(receita real − investimento) / investimento"
          accent="violet"
        />
      </div>

      {/* Comparativo por origem de lead no período */}
      {bySource.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-200">Métricas por origem de lead</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2 font-medium">Origem</th>
                  <th className="px-2 py-2 font-medium">Investimento</th>
                  <th className="px-2 py-2 font-medium">Leads</th>
                  <th className="px-2 py-2 font-medium">Vendas</th>
                  <th className="px-2 py-2 font-medium">CPL</th>
                  <th className="px-2 py-2 font-medium">CAC</th>
                  <th className="px-2 py-2 font-medium">Receita real</th>
                  <th className="px-2 py-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((s) => (
                  <tr key={s.key} className="border-b border-line/50">
                    <td className="px-2 py-2.5 font-semibold text-slate-200">{s.label}</td>
                    <td className="px-2 py-2.5 text-slate-300">{brl(s.t.investment)}</td>
                    <td className="px-2 py-2.5 text-slate-300">{num(s.t.leads)}</td>
                    <td className="px-2 py-2.5 text-slate-300">{num(s.t.sales)}</td>
                    <td className="px-2 py-2.5 text-slate-400">{fmtBrl(s.k.cpl)}</td>
                    <td className="px-2 py-2.5 text-slate-400">{fmtBrl(s.k.cac)}</td>
                    <td className="px-2 py-2.5 font-semibold text-grow-400">{brl(s.k.real)}</td>
                    <td className="px-2 py-2.5 text-slate-400">{fmtPct(s.k.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Evolução do retorno: receita real e ROI */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <LineChartIcon size={16} className="text-grow-400" />
            <h2 className="text-sm font-bold text-slate-200">Evolução — Receita real</h2>
          </div>
          {chartData.length >= 2 ? (
            <TrendChart data={chartData} series={[{ key: "real", label: "Receita real" }]} format="brl" height={220} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Sem dados suficientes no período.</p>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <LineChartIcon size={16} className="text-violet" />
            <h2 className="text-sm font-bold text-slate-200">Evolução — ROI</h2>
          </div>
          {chartData.length >= 2 ? (
            <TrendChart data={chartData} series={[{ key: "roi", label: "ROI" }]} format="pct" height={220} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Sem dados suficientes no período.</p>
          )}
        </div>
      </div>

      {/* Base de cálculo do cliente */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-warn" />
          <h2 className="text-sm font-bold text-slate-200">Base de cálculo</h2>
          <span className="text-xs text-slate-500">define como a receita bruta vira receita real</span>
        </div>
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label className="label">% Conversão real</label>
            {editable ? (
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={cfg.convPercent}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  editCfg({ convPercent: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0 });
                }}
                className="input !w-28"
              />
            ) : (
              <p className="text-lg font-bold text-slate-200">{cfg.convPercent}%</p>
            )}
          </div>
          <div>
            <label className="label">% Comissão / margem</label>
            {editable ? (
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={cfg.commissionPercent}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  editCfg({ commissionPercent: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0 });
                }}
                className="input !w-28"
              />
            ) : (
              <p className="text-lg font-bold text-slate-200">{cfg.commissionPercent}%</p>
            )}
          </div>
          <p className="min-w-[240px] flex-1 rounded-xl border border-line/60 bg-ink-900/50 px-4 py-3 text-xs leading-relaxed text-slate-400">
            No período: receita bruta <b className="text-slate-200">{brl(t.revenue)}</b> × {cfg.convPercent}% ={" "}
            <b className="text-slate-200">{brl(baseExample)}</b> (receita base) × {cfg.commissionPercent}% ={" "}
            <b className="text-grow-400">{brl(k.real)}</b> de receita real.
          </p>
        </div>
        {editable && (
          <p className="mt-2 text-[11px] text-slate-600">
            Vale para todas as linhas; se precisar, dá para definir percentuais diferentes em uma linha específica na
            tabela abaixo.
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
            <table className="w-full min-w-[1340px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2.5 font-medium">Data</th>
                  <th className="px-2 py-2.5 font-medium">Origem</th>
                  <th className="px-2 py-2.5 font-medium">Investimento</th>
                  <th className="px-2 py-2.5 font-medium">Leads</th>
                  <th className="px-2 py-2.5 font-medium">Vendas</th>
                  <th className="px-2 py-2.5 font-medium">Receita bruta</th>
                  <th className="px-2 py-2.5 font-medium">% Conv.</th>
                  <th className="px-2 py-2.5 font-medium">% Com.</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">CAC</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">CPL</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">Ticket</th>
                  <th className="px-2 py-2.5 font-medium text-grow-500">Receita real</th>
                  <th className="px-2 py-2.5 font-medium text-slate-600">ROI</th>
                  {editable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {table.map((r) => {
                  const rk = kpisOf(totalsOf([r], cfg));
                  const hasSales = r.salesDetails.length > 0;
                  return (
                    <tr
                      key={`${r.id}-v${rowVersion[r.id] ?? 0}`}
                      className="border-b border-line/50 transition hover:bg-ink-800/40"
                    >
                      {editable ? (
                        <>
                          <td className="px-1 py-1">
                            <input
                              type="date"
                              defaultValue={r.date}
                              onChange={(e) => e.target.value && edit(r.id, { date: e.target.value })}
                              className={cn(inputCls, "min-w-[128px]")}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <select
                              defaultValue={r.source}
                              onChange={(e) => edit(r.id, { source: e.target.value })}
                              className={cn(inputCls, "min-w-[120px] cursor-pointer bg-ink-900/0")}
                            >
                              {SOURCES.map((s) => (
                                <option key={s.key} value={s.key} className="bg-ink-900">
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          {(["investment", "leads", "sales", "revenue"] as const).map((field) => {
                            // Com vendas detalhadas, Vendas e Receita bruta vêm delas (não editar direto)
                            const synced = hasSales && (field === "sales" || field === "revenue");
                            return (
                              <td key={field} className="px-1 py-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step={field === "leads" || field === "sales" ? 1 : 0.01}
                                    defaultValue={r[field] || ""}
                                    placeholder="0"
                                    disabled={synced}
                                    title={synced ? "Calculado pelas vendas detalhadas — clique no ícone ao lado" : undefined}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      edit(r.id, { [field]: Number.isFinite(v) && v >= 0 ? v : 0 });
                                    }}
                                    className={cn(inputCls, "min-w-[90px]", synced && "opacity-70")}
                                  />
                                  {field === "sales" && (
                                    <button
                                      onClick={() => setSalesEntryId(r.id)}
                                      title="Detalhar vendas: quem vendeu, valor, comprador…"
                                      className={cn(
                                        "flex shrink-0 items-center gap-0.5 rounded-lg p-1.5 text-xs transition",
                                        hasSales
                                          ? "bg-brand-500/15 text-brand-300 hover:bg-brand-500/25"
                                          : "text-slate-600 hover:bg-ink-800 hover:text-slate-300"
                                      )}
                                    >
                                      <UserRound size={14} />
                                      {hasSales && <span className="font-semibold">{r.salesDetails.length}</span>}
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {(["convPercent", "commissionPercent"] as const).map((field) => (
                            <td key={field} className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                defaultValue={r[field] ?? ""}
                                placeholder={String(field === "convPercent" ? cfg.convPercent : cfg.commissionPercent)}
                                title="Vazio = usa o padrão da base de cálculo"
                                onChange={(e) => {
                                  if (e.target.value === "") return edit(r.id, { [field]: null });
                                  const v = Number(e.target.value);
                                  edit(r.id, { [field]: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null });
                                }}
                                className={cn(inputCls, "min-w-[64px]")}
                              />
                            </td>
                          ))}
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2.5 text-slate-300">{r.date.split("-").reverse().join("/")}</td>
                          <td className="px-2 py-2.5 text-slate-400">{sourceLabel(r.source)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{brl(r.investment)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{num(r.leads)}</td>
                          <td className="px-2 py-2.5 text-slate-300">
                            <span className="flex items-center gap-1.5">
                              {num(r.sales)}
                              {hasSales && (
                                <button
                                  onClick={() => setSalesEntryId(r.id)}
                                  title="Ver quem fez as vendas"
                                  className="flex items-center gap-0.5 rounded-lg bg-brand-500/15 p-1 px-1.5 text-xs text-brand-300 transition hover:bg-brand-500/25"
                                >
                                  <UserRound size={13} />
                                  <span className="font-semibold">{r.salesDetails.length}</span>
                                </button>
                              )}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-slate-300">{brl(r.revenue)}</td>
                          <td className="px-2 py-2.5 text-slate-400">{r.convPercent ?? cfg.convPercent}%</td>
                          <td className="px-2 py-2.5 text-slate-400">{r.commissionPercent ?? cfg.commissionPercent}%</td>
                        </>
                      )}
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.cac)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.cpl)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtBrl(rk.ticket)}</td>
                      <td className="px-2 py-2.5 text-xs font-semibold text-grow-400">{brl(rk.real)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-500">{fmtPct(rk.roi)}</td>
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
            Edite qualquer célula direto na tabela — KPIs, variações e gráficos recalculam na hora e tudo é salvo
            automaticamente. % Conv. e % Com. vazios usam o padrão da base de cálculo.
          </p>
        )}
      </div>

      {/* Painel de Instagram (estilo Insights), com o mesmo período selecionado */}
      <InstagramPanel clientId={clientId} editable={editable} range={range} />

      {/* Vendas detalhadas do lançamento selecionado */}
      {salesEntryId && rows.some((r) => r.id === salesEntryId) && (
        <SalesModal
          entry={rows.find((r) => r.id === salesEntryId)!}
          editable={editable}
          onClose={() => setSalesEntryId(null)}
          onEntryUpdate={applyEntryUpdate}
        />
      )}
    </div>
  );
}
