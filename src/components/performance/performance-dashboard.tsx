"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  LineChart as LineChartIcon,
  Minus,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/ui/stat-card";
import { InstagramPanel, type IgSummary } from "@/components/performance/instagram-panel";
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
  /** Campanha específica do lançamento (ex.: "Brasil — Automóvel") */
  campaign: string | null;
  /** Objetivo da campanha (chave de CAMPAIGN_TYPES) */
  campaignType: string | null;
  /** Métricas de mídia — preenchidas por campanhas de Tráfego/Engajamento/Reconhecimento */
  views: number;
  clicks: number;
  reach: number;
  interactions: number;
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

/** Objetivos de campanha disponíveis no dropdown e no filtro */
export const CAMPAIGN_TYPES = [
  { key: "LEADS", label: "Leads" },
  { key: "VENDAS", label: "Vendas" },
  { key: "ENGAJAMENTO", label: "Engajamento" },
  { key: "RECONHECIMENTO", label: "Reconhecimento" },
  { key: "TRAFEGO", label: "Tráfego" },
  { key: "OUTRO", label: "Outro" },
] as const;
const campaignTypeLabel = (key: string | null) => CAMPAIGN_TYPES.find((t) => t.key === key)?.label ?? "—";

/* ————— Métricas por tipo de campanha —————
   Campanhas de conversão (Leads, Vendas, Outro ou sem tipo) lançam
   Leads/Vendas/Receita; campanhas de mídia lançam as métricas do seu objetivo:
   Tráfego = visualizações e cliques; Engajamento = visualizações, alcance e
   interações; Reconhecimento = visualizações e alcance. */

type MediaField = "views" | "clicks" | "reach" | "interactions";
const MEDIA_FIELD_META: { key: MediaField; label: string }[] = [
  { key: "views", label: "Visualizações" },
  { key: "clicks", label: "Cliques" },
  { key: "reach", label: "Alcance" },
  { key: "interactions", label: "Interações" },
];
const MEDIA_TYPE_FIELDS: Record<string, readonly MediaField[]> = {
  TRAFEGO: ["views", "clicks"],
  ENGAJAMENTO: ["views", "reach", "interactions"],
  RECONHECIMENTO: ["views", "reach"],
};
/** Sem tipo, Leads, Vendas e Outro seguem o fluxo de conversão (leads → vendas → receita) */
const isConversionType = (t: string | null) => !t || !(t in MEDIA_TYPE_FIELDS);
const mediaFieldsOf = (t: string | null): readonly MediaField[] => (t && MEDIA_TYPE_FIELDS[t]) || [];
const rowHasMedia = (r: PerfRow, f: MediaField) => mediaFieldsOf(r.campaignType).includes(f);

export type PerfConfig = { convPercent: number; commissionPercent: number };

/* ————— Cálculos (estilo planilha: tudo derivado, nada armazenado) ————— */

type Totals = {
  investment: number;
  /** Só o investimento das campanhas de conversão — base de CAC/CPL/ROI */
  convInvestment: number;
  leads: number;
  sales: number;
  revenue: number;
  real: number;
};

/** Receita Real da linha = bruta × % conversão real × % comissão (override ou padrão) */
function realOf(r: PerfRow, cfg: PerfConfig) {
  const conv = r.convPercent ?? cfg.convPercent;
  const comm = r.commissionPercent ?? cfg.commissionPercent;
  return r.revenue * (conv / 100) * (comm / 100);
}

/** Leads/Vendas/Receita só contam nas linhas de conversão; mídia entra em mediaOf */
function totalsOf(rows: PerfRow[], cfg: PerfConfig): Totals {
  return rows.reduce(
    (t, r) => {
      const conv = isConversionType(r.campaignType);
      return {
        investment: t.investment + r.investment,
        convInvestment: t.convInvestment + (conv ? r.investment : 0),
        leads: t.leads + (conv ? r.leads : 0),
        sales: t.sales + (conv ? r.sales : 0),
        revenue: t.revenue + (conv ? r.revenue : 0),
        real: t.real + (conv ? realOf(r, cfg) : 0),
      };
    },
    { investment: 0, convInvestment: 0, leads: 0, sales: 0, revenue: 0, real: 0 }
  );
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function kpisOf(t: Totals) {
  return {
    cac: ratio(t.convInvestment, t.sales),
    cpl: ratio(t.convInvestment, t.leads),
    custoConv: ratio(t.convInvestment, t.sales),
    ticket: ratio(t.revenue, t.sales),
    // Valor por lead = valor gasto / leads gerados (pedido do cliente)
    valorLead: ratio(t.convInvestment, t.leads),
    real: t.real,
    // ROI sobre a receita REAL (não a bruta), em % — só sobre investimento de conversão
    roi: t.convInvestment > 0 ? ((t.real - t.convInvestment) / t.convInvestment) * 100 : null,
  };
}

/** Totais e custos das campanhas de mídia (cada custo usa só o investimento
    das linhas cujo tipo lança aquela métrica). */
function mediaOf(rows: PerfRow[]) {
  const sum = (f: MediaField) => rows.reduce((s, r) => s + (rowHasMedia(r, f) ? r[f] : 0), 0);
  const inv = (f: MediaField) => rows.reduce((s, r) => s + (rowHasMedia(r, f) ? r.investment : 0), 0);
  const views = sum("views");
  const clicks = sum("clicks");
  const reach = sum("reach");
  const interactions = sum("interactions");
  return {
    views,
    clicks,
    reach,
    interactions,
    cpv: ratio(inv("views"), views),
    cpc: ratio(inv("clicks"), clicks),
    custoInteracao: ratio(inv("interactions"), interactions),
    custoAlcance: ratio(inv("reach"), reach),
  };
}

/** Resultado principal de um conjunto de linhas, guiado pelo tipo mais frequente */
function mainResultOf(rows: PerfRow[], cfg: PerfConfig) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.campaignType ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const t = totalsOf(rows, cfg);
  const m = mediaOf(rows);
  switch (top) {
    case "VENDAS":
      return { label: `${num(t.sales)} vendas`, cost: kpisOf(t).cac, costLabel: "CAC" };
    case "TRAFEGO":
      return { label: `${num(m.views)} visualizações`, cost: m.cpv, costLabel: "custo por visualização" };
    case "ENGAJAMENTO":
      return { label: `${num(m.interactions)} interações`, cost: m.custoInteracao, costLabel: "custo por interação" };
    case "RECONHECIMENTO":
      return { label: `${num(m.reach)} alcançados`, cost: m.custoAlcance, costLabel: "custo por alcance" };
    default:
      return { label: `${num(t.leads)} leads`, cost: kpisOf(t).cpl, costLabel: "CPL" };
  }
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
  const [campaign, setCampaign] = useState<string>("");
  const [campaignType, setCampaignType] = useState<string>("");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 29 * dayMs)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: string }>({ state: "idle" });
  const [adding, setAdding] = useState(false);
  /* Modal de vendas detalhadas + contador de versão por linha: os inputs da
     tabela são não-controlados, então quando o modal re-sincroniza Vendas e
     Receita bruta a linha precisa remontar para exibir os novos valores. */
  const [salesEntryId, setSalesEntryId] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState<Record<string, number>>({});
  /* Resumo do Instagram no período, entregue pelo painel (seção Resultados) */
  const [ig, setIg] = useState<IgSummary | null>(null);

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
    const bySource = (list: PerfRow[]) =>
      (source === "TODAS" ? list : list.filter((r) => r.source === source))
        .filter((r) => !campaign || (r.campaign ?? "") === campaign)
        .filter((r) => !campaignType || (r.campaignType ?? "") === campaignType);
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
  }, [rows, period, from, to, source, campaign, campaignType]);

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
        .filter((r) => !campaign || (r.campaign ?? "") === campaign)
        .filter((r) => !campaignType || (r.campaignType ?? "") === campaignType)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [rows, source, campaign, campaignType]
  );

  /* Campanhas conhecidas + comparativo por campanha no período */
  const campaignNames = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.campaign?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows]
  );
  const typesInUse = useMemo(
    () => CAMPAIGN_TYPES.filter((t) => (rows ?? []).some((r) => r.campaignType === t.key)),
    [rows]
  );
  const byCampaign = useMemo(
    () =>
      campaignNames
        .map((name) => {
          const cRows = currentAll.filter((r) => (r.campaign ?? "") === name);
          const types = [...new Set(cRows.map((r) => campaignTypeLabel(r.campaignType)).filter((l) => l !== "—"))];
          const hasConv = cRows.some((r) => isConversionType(r.campaignType));
          return {
            name,
            types,
            count: cRows.length,
            hasConv,
            main: mainResultOf(cRows, cfg),
            k: kpisOf(totalsOf(cRows, cfg)),
            t: totalsOf(cRows, cfg),
          };
        })
        .filter((c) => c.count > 0),
    [campaignNames, currentAll, cfg]
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
  const prevBase = pt.revenue * (cfg.convPercent / 100);

  /* ————— Visão geral: leitura estratégica (tendências + alertas), sem números crus —————
     Sem lançamentos no período anterior, a tendência compara o fim × o início
     do próprio período (metades por data); com um único dia de dados, os
     tiles mostram os valores atuais em vez de "sem base de comparação". */
  let cmpCur = current;
  let cmpPrev = previous;
  let cmpNote = "vs período anterior";
  if (previous.length === 0) {
    const dates = [...new Set(current.map((r) => r.date))].sort();
    if (dates.length >= 2) {
      const mid = dates[Math.ceil(dates.length / 2)];
      cmpPrev = current.filter((r) => r.date < mid);
      cmpCur = current.filter((r) => r.date >= mid);
      cmpNote = "fim vs início do período";
    }
  }
  const ck = kpisOf(totalsOf(cmpCur, cfg));
  const cpv = kpisOf(totalsOf(cmpPrev, cfg));
  const cct = totalsOf(cmpCur, cfg);
  const cpt = totalsOf(cmpPrev, cfg);
  const dCac = delta(ck.cac, cpv.cac);
  const dCpl = delta(ck.cpl, cpv.cpl);
  const convRate = t.leads > 0 ? (t.sales / t.leads) * 100 : null;
  const prevConvRate = pt.leads > 0 ? (pt.sales / pt.leads) * 100 : null;
  const cmpConvCur = cct.leads > 0 ? (cct.sales / cct.leads) * 100 : null;
  const cmpConvPrev = cpt.leads > 0 ? (cpt.sales / cpt.leads) * 100 : null;
  const dConv = delta(cmpConvCur, cmpConvPrev);
  const dRoi = delta(ck.roi, cpv.roi);
  const returnPerReal = t.convInvestment > 0 ? k.real / t.convInvestment : null;

  /* Métricas de mídia do período (tráfego / engajamento / reconhecimento) */
  const hasMediaRows = current.some((r) => !isConversionType(r.campaignType));
  const m = mediaOf(current);
  const pm = mediaOf(previous);

  const trendPhrase = (d: number | undefined, up: string, down: string, flat: string, atual: string) =>
    d === undefined ? atual : d >= 1 ? up : d <= -1 ? down : flat;

  const trends: { title: string; delta?: number; good?: boolean; phrase: string }[] = [
    {
      title: "Tendência de CAC",
      delta: dCac,
      good: dCac === undefined ? undefined : dCac <= 0,
      phrase: trendPhrase(dCac, "Custo de aquisição subindo", "Custo de aquisição caindo", "Custo de aquisição estável", `CAC atual: ${fmtBrl(k.cac)}`),
    },
    {
      title: "Tendência de CPL",
      delta: dCpl,
      good: dCpl === undefined ? undefined : dCpl <= 0,
      phrase: trendPhrase(dCpl, "Leads ficando mais caros", "Leads ficando mais baratos", "Custo por lead estável", `CPL atual: ${fmtBrl(k.cpl)}`),
    },
    {
      title: "Eficiência de conversão",
      delta: dConv,
      good: dConv === undefined ? undefined : dConv >= 0,
      phrase: trendPhrase(dConv, "Conversão de leads em vendas melhorando", "Conversão de leads em vendas piorando", "Conversão estável", `Conversão atual: ${fmtPct(convRate)}`),
    },
    {
      title: "Investimento × retorno",
      delta: dRoi,
      good: returnPerReal === null ? undefined : returnPerReal >= 1,
      phrase:
        returnPerReal === null
          ? "Sem investimento no período"
          : `Cada R$ 1 investido volta como R$ ${returnPerReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de receita real`,
    },
  ];

  const absPct = (v: number) => `${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const alerts: { tone: "danger" | "warn" | "ok"; msg: string }[] = [];
  if (dCac !== undefined && dCac > 20) alerts.push({ tone: "warn", msg: `CAC subiu ${absPct(dCac)} (${cmpNote}) — custo de aquisição pressionado.` });
  if (dCpl !== undefined && dCpl > 20) alerts.push({ tone: "warn", msg: `CPL subiu ${absPct(dCpl)} — cada lead está custando mais caro.` });
  if (dConv !== undefined && dConv < -20) alerts.push({ tone: "danger", msg: `Queda de ${absPct(dConv)} na conversão de leads em vendas.` });
  if (k.roi !== null && k.roi < 0) alerts.push({ tone: "danger", msg: "ROI negativo: o investimento superou a receita real no período." });
  if (t.convInvestment > 0 && t.leads === 0)
    alerts.push({ tone: "warn", msg: "Há investimento em campanhas de conversão sem nenhum lead registrado no período." });
  // Crescimento positivo também é alerta — boas notícias em destaque
  if (dCac !== undefined && dCac < -15) alerts.push({ tone: "ok", msg: `Bom sinal: o CAC caiu ${absPct(dCac)} (${cmpNote}).` });
  if (dCpl !== undefined && dCpl < -15) alerts.push({ tone: "ok", msg: `Leads mais baratos: o CPL caiu ${absPct(dCpl)}.` });
  if (dConv !== undefined && dConv > 15) alerts.push({ tone: "ok", msg: `A conversão de leads em vendas cresceu ${absPct(dConv)}.` });
  if (k.roi !== null && k.roi > 100) alerts.push({ tone: "ok", msg: "ROI acima de 100%: o retorno real mais que dobra o investimento." });

  /* Resumo interpretativo — uma frase que junta custo × conversão */
  const custoDelta = dCac ?? dCpl;
  const custoNome = dCac !== undefined ? "custo por venda" : "custo por lead";
  let resumo: string;
  if (current.length === 0) {
    resumo = "Ainda não há lançamentos no período selecionado.";
  } else if (custoDelta === undefined && dConv === undefined) {
    resumo = `Primeiros lançamentos do período: CAC ${fmtBrl(k.cac)}${convRate !== null ? ` e conversão de ${fmtPct(convRate)}` : ""}. A leitura de tendência aparece a partir do segundo dia de dados.`;
    if (returnPerReal !== null) {
      resumo += ` Cada R$ 1 investido está voltando como R$ ${returnPerReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de receita real.`;
    }
  } else {
    const partes: string[] = [];
    if (custoDelta !== undefined) {
      partes.push(
        custoDelta <= -1
          ? `seu ${custoNome} caiu ${absPct(custoDelta)}`
          : custoDelta >= 1
            ? `seu ${custoNome} subiu ${absPct(custoDelta)}`
            : `seu ${custoNome} se manteve estável`
      );
    }
    if (dConv !== undefined) {
      partes.push(
        dConv >= 1 ? `a conversão aumentou ${absPct(dConv)}` : dConv <= -1 ? `a conversão caiu ${absPct(dConv)}` : "a conversão ficou estável"
      );
    }
    const goodCusto = custoDelta === undefined ? undefined : custoDelta <= 0;
    const goodConv = dConv === undefined ? undefined : dConv >= 0;
    const sufixo =
      goodCusto !== false && goodConv !== false
        ? " — ótimo sinal."
        : goodCusto === false && goodConv === false
          ? " — atenção ao rumo do período."
          : " — movimento misto, vale acompanhar.";
    const frase = partes.join(" enquanto ");
    resumo = frase.charAt(0).toUpperCase() + frase.slice(1) + sufixo;
    if (returnPerReal !== null) {
      resumo += ` Cada R$ 1 investido está voltando como R$ ${returnPerReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de receita real.`;
    }
  }

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

      {/* Filtro por campanha — definida na coluna Campanha da tabela */}
      {campaignNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Campanha:</span>
          <button
            onClick={() => setCampaign("")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              campaign === ""
                ? "border-violet/40 bg-violet/15 text-violet"
                : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
            )}
          >
            Todas
          </button>
          {campaignNames.map((name) => (
            <button
              key={name}
              onClick={() => setCampaign(name)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                campaign === name
                  ? "border-violet/40 bg-violet/15 text-violet"
                  : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
              )}
            >
              {name} ({(rows ?? []).filter((r) => (r.campaign ?? "") === name).length})
            </button>
          ))}
        </div>
      )}

      {/* Filtro por objetivo da campanha */}
      {typesInUse.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo:</span>
          {[{ key: "", label: "Todos" }, ...typesInUse].map((t) => (
            <button
              key={t.key}
              onClick={() => setCampaignType(t.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                campaignType === t.key
                  ? "border-warn/40 bg-warn/15 text-warn"
                  : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Visão geral — leitura estratégica: tendências e alertas, sem números crus */}
      <div className="card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Compass size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-slate-200">Visão geral — o que está acontecendo</h2>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Leitura estratégica do período. Os números completos ficam em Resultados, logo abaixo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trends.map((tr) => {
            const Arrow = tr.delta === undefined ? Minus : tr.delta >= 0 ? TrendingUp : TrendingDown;
            return (
              <div key={tr.title} className="rounded-xl border border-line/60 bg-ink-900/50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{tr.title}</p>
                <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-200">{tr.phrase}</p>
                {tr.delta !== undefined ? (
                  <span
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 text-xs font-semibold",
                      tr.good === undefined ? "text-slate-500" : tr.good ? "text-grow-400" : "text-danger"
                    )}
                  >
                    <Arrow size={13} />
                    {absPct(tr.delta)} {cmpNote}
                  </span>
                ) : (
                  <span className="mt-1.5 block text-xs text-slate-500">
                    tendência aparece com 2+ dias de lançamentos
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Resumo interpretativo — a leitura em uma frase */}
        <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Resumo interpretativo</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-200">{resumo}</p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Alertas estratégicos</p>
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-grow-400">
              <CheckCircle2 size={15} /> Nenhum alerta: operação saudável no período.
            </p>
          ) : (
            alerts.map((a) => (
              <p
                key={a.msg}
                className={cn(
                  "flex items-start gap-2 text-sm",
                  a.tone === "danger" ? "text-danger" : a.tone === "warn" ? "text-warn" : "text-grow-400"
                )}
              >
                {a.tone === "ok" ? (
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                )}{" "}
                {a.msg}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Resultados — resumo consolidado com todas as métricas reais */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-200">Resultados — resumo consolidado</h2>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Performance</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="CAC" value={fmtBrl(k.cac)} delta={delta(k.cac, p.cac)} hint="investimento / vendas" accent="brand" lowerIsBetter />
          <StatCard
            label="Conversão de leads"
            value={fmtPct(convRate)}
            delta={delta(convRate, prevConvRate)}
            hint="vendas / leads gerados"
            accent="violet"
          />
          <StatCard
            label="Custo por conversão"
            value={fmtBrl(k.custoConv)}
            delta={delta(k.custoConv, p.custoConv)}
            hint="investimento / vendas"
            accent="warn"
            lowerIsBetter
          />
          <StatCard label="Ticket médio" value={fmtBrl(k.ticket)} delta={delta(k.ticket, p.ticket)} hint="receita bruta / vendas" accent="grow" />
          <StatCard
            label="Valor por lead"
            value={fmtBrl(k.valorLead)}
            delta={delta(k.valorLead, p.valorLead)}
            hint="valor gasto / leads gerados"
            accent="grow"
            lowerIsBetter
          />
        </div>

        {hasMediaRows && (
          <>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tráfego e engajamento
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label="Visualizações"
                value={num(m.views)}
                delta={delta(m.views, pm.views)}
                hint="campanhas de tráfego, engajamento e reconhecimento"
                accent="brand"
              />
              <StatCard
                label="Custo por visualização"
                value={fmtBrl(m.cpv)}
                delta={delta(m.cpv, pm.cpv)}
                hint="investimento / visualizações"
                accent="warn"
                lowerIsBetter
              />
              <StatCard
                label="Cliques"
                value={num(m.clicks)}
                delta={delta(m.clicks, pm.clicks)}
                hint={m.cpc === null ? "campanhas de tráfego" : `custo por clique ${fmtBrl(m.cpc)}`}
                accent="violet"
              />
              <StatCard
                label="Alcance"
                value={num(m.reach)}
                delta={delta(m.reach, pm.reach)}
                hint={m.custoAlcance === null ? "pessoas alcançadas" : `custo por alcance ${fmtBrl(m.custoAlcance)}`}
                accent="grow"
              />
              <StatCard
                label="Interações"
                value={num(m.interactions)}
                delta={delta(m.interactions, pm.interactions)}
                hint={m.custoInteracao === null ? "campanhas de engajamento" : `custo por interação ${fmtBrl(m.custoInteracao)}`}
                accent="brand"
              />
            </div>
          </>
        )}

        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Financeiro</p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Receita bruta"
            value={brl(t.revenue)}
            delta={delta(t.revenue, pt.revenue)}
            hint="valor total vendido"
            accent="brand"
          />
          <StatCard
            label="Receita base"
            value={brl(baseExample)}
            delta={delta(baseExample, prevBase)}
            hint={`bruta × ${cfg.convPercent}% de conversão real`}
            accent="violet"
          />
          <StatCard
            label="Receita real"
            value={brl(k.real)}
            delta={delta(k.real, p.real)}
            hint={`base × ${cfg.commissionPercent}% — a métrica principal`}
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

        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Instagram</p>
        {ig && (ig.followers !== null || ig.totalViews > 0) ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Visualizações" value={num(ig.totalViews)} hint="total no período" accent="brand" />
            <StatCard label="Seguidores" value={ig.followers === null ? "—" : num(ig.followers)} hint="último lançamento" accent="violet" />
            <StatCard
              label="Crescimento de seguidores"
              value={ig.growth === undefined ? "—" : `${ig.growth >= 0 ? "+" : ""}${ig.growth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              hint="no período"
              accent="grow"
            />
            <StatCard label="Engajamento médio" value={fmtPct(ig.avgEngagement)} hint="interações / alcance" accent="warn" />
            <StatCard label="% não seguidores" value={fmtPct(ig.avgNonFollowers)} hint="expansão de público" accent="brand" />
          </div>
        ) : (
          <p className="rounded-xl border border-line/60 bg-ink-900/40 px-4 py-3 text-xs text-slate-500">
            Sem dados de Instagram no período — lance no painel Instagram, no fim da página.
          </p>
        )}
      </div>

      {/* Comparativo por campanha no período — CAC/CPL de cada campanha */}
      {byCampaign.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-200">Métricas por campanha</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2 font-medium">Campanha</th>
                  <th className="px-2 py-2 font-medium">Tipo</th>
                  <th className="px-2 py-2 font-medium">Investimento</th>
                  <th className="px-2 py-2 font-medium">Resultado principal</th>
                  <th className="px-2 py-2 font-medium">Custo por resultado</th>
                  <th className="px-2 py-2 font-medium">Leads</th>
                  <th className="px-2 py-2 font-medium">Vendas</th>
                  <th className="px-2 py-2 font-medium">Receita real</th>
                  <th className="px-2 py-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {byCampaign.map((c) => (
                  <tr key={c.name} className="border-b border-line/50">
                    <td className="px-2 py-2.5 font-semibold text-slate-200">{c.name}</td>
                    <td className="px-2 py-2.5 text-slate-400">{c.types.length > 0 ? c.types.join(" · ") : "—"}</td>
                    <td className="px-2 py-2.5 text-slate-300">{brl(c.t.investment)}</td>
                    <td className="px-2 py-2.5 font-semibold text-slate-200">{c.main.label}</td>
                    <td className="px-2 py-2.5 text-slate-400">
                      {fmtBrl(c.main.cost)} <span className="text-xs text-slate-600">({c.main.costLabel})</span>
                    </td>
                    <td className="px-2 py-2.5 text-slate-300">{c.hasConv ? num(c.t.leads) : "—"}</td>
                    <td className="px-2 py-2.5 text-slate-300">{c.hasConv ? num(c.t.sales) : "—"}</td>
                    <td className="px-2 py-2.5 font-semibold text-grow-400">{c.hasConv ? brl(c.k.real) : "—"}</td>
                    <td className="px-2 py-2.5 text-slate-400">{c.hasConv ? fmtPct(c.k.roi) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
            <table className="w-full min-w-[2080px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2.5 font-medium">Data</th>
                  <th className="px-2 py-2.5 font-medium">Origem</th>
                  <th className="px-2 py-2.5 font-medium">Campanha</th>
                  <th className="px-2 py-2.5 font-medium">Tipo</th>
                  <th className="px-2 py-2.5 font-medium">Investimento</th>
                  <th className="px-2 py-2.5 font-medium">Leads</th>
                  <th className="px-2 py-2.5 font-medium">Vendas</th>
                  <th className="px-2 py-2.5 font-medium">Receita bruta</th>
                  <th className="px-2 py-2.5 font-medium">% Conv.</th>
                  <th className="px-2 py-2.5 font-medium">% Com.</th>
                  <th className="px-2 py-2.5 font-medium text-violet">Visualiz.</th>
                  <th className="px-2 py-2.5 font-medium text-violet">Cliques</th>
                  <th className="px-2 py-2.5 font-medium text-violet">Alcance</th>
                  <th className="px-2 py-2.5 font-medium text-violet">Interações</th>
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
                  const isConv = isConversionType(r.campaignType);
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
                          <td className="px-1 py-1">
                            <input
                              list="perf-campanhas"
                              defaultValue={r.campaign ?? ""}
                              placeholder="Campanha…"
                              title="Ex.: Europa, Brasil — Automóvel"
                              onChange={(e) => edit(r.id, { campaign: e.target.value })}
                              className={cn(inputCls, "min-w-[130px]")}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <select
                              defaultValue={r.campaignType ?? ""}
                              onChange={(e) => edit(r.id, { campaignType: e.target.value || null })}
                              className={cn(inputCls, "min-w-[120px] cursor-pointer")}
                              title="Objetivo da campanha — define quais métricas fazem sentido lançar"
                            >
                              <option value="" className="bg-ink-900">Tipo…</option>
                              {CAMPAIGN_TYPES.map((t) => (
                                <option key={t.key} value={t.key} className="bg-ink-900">
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              defaultValue={r.investment || ""}
                              placeholder="0"
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                edit(r.id, { investment: Number.isFinite(v) && v >= 0 ? v : 0 });
                              }}
                              className={cn(inputCls, "min-w-[90px]")}
                            />
                          </td>
                          {(["leads", "sales", "revenue"] as const).map((field) => {
                            // Com vendas detalhadas, Vendas e Receita bruta vêm delas (não editar direto)
                            const synced = hasSales && (field === "sales" || field === "revenue");
                            const disabled = !isConv || synced;
                            return (
                              <td key={field} className="px-1 py-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step={field === "leads" || field === "sales" ? 1 : 0.01}
                                    defaultValue={r[field] || ""}
                                    placeholder={isConv ? "0" : "—"}
                                    disabled={disabled}
                                    title={
                                      !isConv
                                        ? "Campanha desse tipo não lança leads/vendas/receita"
                                        : synced
                                          ? "Calculado pelas vendas detalhadas — clique no ícone ao lado"
                                          : undefined
                                    }
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      edit(r.id, { [field]: Number.isFinite(v) && v >= 0 ? v : 0 });
                                    }}
                                    className={cn(inputCls, "min-w-[90px]", disabled && "opacity-40")}
                                  />
                                  {field === "sales" && isConv && (
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
                                placeholder={isConv ? String(field === "convPercent" ? cfg.convPercent : cfg.commissionPercent) : "—"}
                                disabled={!isConv}
                                title={!isConv ? "Campanha desse tipo não usa base de cálculo" : "Vazio = usa o padrão da base de cálculo"}
                                onChange={(e) => {
                                  if (e.target.value === "") return edit(r.id, { [field]: null });
                                  const v = Number(e.target.value);
                                  edit(r.id, { [field]: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null });
                                }}
                                className={cn(inputCls, "min-w-[64px]", !isConv && "opacity-40")}
                              />
                            </td>
                          ))}
                          {MEDIA_FIELD_META.map(({ key }) => {
                            const applies = rowHasMedia(r, key);
                            return (
                              <td key={key} className="px-1 py-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  defaultValue={r[key] || ""}
                                  placeholder={applies ? "0" : "—"}
                                  disabled={!applies}
                                  title={!applies ? "Campanha desse tipo não usa esta métrica" : undefined}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    edit(r.id, { [key]: Number.isFinite(v) && v >= 0 ? v : 0 });
                                  }}
                                  className={cn(inputCls, "min-w-[80px]", !applies && "opacity-40")}
                                />
                              </td>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2.5 text-slate-300">{r.date.split("-").reverse().join("/")}</td>
                          <td className="px-2 py-2.5 text-slate-400">{sourceLabel(r.source)}</td>
                          <td className="px-2 py-2.5 text-slate-400">{r.campaign ?? "—"}</td>
                          <td className="px-2 py-2.5 text-slate-400">{campaignTypeLabel(r.campaignType)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{brl(r.investment)}</td>
                          <td className="px-2 py-2.5 text-slate-300">{isConv ? num(r.leads) : "—"}</td>
                          <td className="px-2 py-2.5 text-slate-300">
                            <span className="flex items-center gap-1.5">
                              {isConv ? num(r.sales) : "—"}
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
                          <td className="px-2 py-2.5 text-slate-300">{isConv ? brl(r.revenue) : "—"}</td>
                          <td className="px-2 py-2.5 text-slate-400">{isConv ? `${r.convPercent ?? cfg.convPercent}%` : "—"}</td>
                          <td className="px-2 py-2.5 text-slate-400">{isConv ? `${r.commissionPercent ?? cfg.commissionPercent}%` : "—"}</td>
                          {MEDIA_FIELD_META.map(({ key }) => (
                            <td key={key} className="px-2 py-2.5 text-slate-300">
                              {rowHasMedia(r, key) ? num(r[key]) : "—"}
                            </td>
                          ))}
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
        <datalist id="perf-campanhas">
          {campaignNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {editable && table.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-600">
            Edite qualquer célula direto na tabela — KPIs, variações e gráficos recalculam na hora e tudo é salvo
            automaticamente. % Conv. e % Com. vazios usam o padrão da base de cálculo.
          </p>
        )}
      </div>

      {/* Painel de Instagram (estilo Insights), com o mesmo período selecionado */}
      <InstagramPanel clientId={clientId} editable={editable} range={range} onSummary={setIg} />

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
