"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Instagram, Plus, Trash2 } from "lucide-react";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/ui/stat-card";
import { cn, num } from "@/lib/utils";

export type IgRow = {
  id: string;
  date: string; // yyyy-mm-dd
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers: number;
  reach: number;
  nonFollowersPct: number;
};

/** Taxa de engajamento = (curtidas + comentários + compartilhamentos + salvamentos) / alcance */
function engagementOf(r: IgRow) {
  const interactions = r.likes + r.comments + r.shares + r.saves;
  return r.reach > 0 ? (interactions / r.reach) * 100 : null;
}

const fmtPct = (v: number | null, digits = 1) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;

const NUM_FIELDS = [
  ["views", "Visualizações"],
  ["likes", "Curtidas"],
  ["comments", "Comentários"],
  ["shares", "Compart."],
  ["saves", "Salvos"],
  ["followers", "Seguidores"],
  ["reach", "Alcance"],
] as const;

/**
 * Painel de Instagram (estilo Insights) do dashboard de Performance:
 * lançamentos manuais diários com engajamento, crescimento de seguidores e
 * % de não seguidores derivados na hora. Mesmo autosave da tabela principal.
 * KPIs e gráficos seguem o período selecionado no topo do dashboard.
 */
export function InstagramPanel({
  clientId,
  editable,
  range,
}: {
  clientId: string;
  editable: boolean;
  range: { start: string; end: string } | null;
}) {
  const [rows, setRows] = useState<IgRow[] | null>(null);
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: string }>({ state: "idle" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/performance/instagram?clientId=${clientId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRows(d.entries as IgRow[]))
      .catch(() => setRows([]));
  }, [clientId]);

  /* Autosave com debounce + keepalive ao sair (mesmo padrão da tabela principal) */
  const pending = useRef<Map<string, Partial<IgRow>>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    const batch = [...pending.current.entries()];
    pending.current.clear();
    if (!batch.length) return;
    setSave({ state: "saving" });
    try {
      for (const [id, patch] of batch) {
        const res = await fetch("/api/performance/instagram", {
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
  }

  useEffect(() => {
    const flushNow = () => {
      for (const [id, patch] of pending.current) {
        fetch("/api/performance/instagram", {
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

  function edit(id: string, patch: Partial<IgRow>) {
    setRows((prev) => prev!.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  async function addRow() {
    setAdding(true);
    try {
      const res = await fetch("/api/performance/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, date: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error();
      const { entry } = await res.json();
      setRows((prev) => [...(prev ?? []), entry as IgRow]);
    } catch {
      setSave({ state: "error" });
    } finally {
      setAdding(false);
    }
  }

  async function removeRow(id: string) {
    setRows((prev) => prev!.filter((r) => r.id !== id));
    const res = await fetch(`/api/performance/instagram?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) setSave({ state: "error" });
  }

  /* Janela do período vinda do dashboard (null = todo o histórico) */
  const current = useMemo(() => {
    const all = [...(rows ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    if (!range) return all;
    return all.filter((r) => r.date >= range.start && r.date <= range.end);
  }, [rows, range]);

  /* Crescimento de seguidores no período: primeiro × último lançamento */
  const first = current[0];
  const last = current[current.length - 1];
  const growth =
    first && last && first.id !== last.id && first.followers > 0
      ? ((last.followers - first.followers) / first.followers) * 100
      : undefined;
  const totalViews = current.reduce((s, r) => s + r.views, 0);
  const totalReach = current.reduce((s, r) => s + r.reach, 0);
  const totalInteractions = current.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0);
  const avgEngagement = totalReach > 0 ? (totalInteractions / totalReach) * 100 : null;

  const chartData = useMemo(
    () =>
      current.map((r) => ({
        label: new Date(`${r.date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        seguidores: r.followers,
        visualizacoes: r.views,
        engajamento: engagementOf(r) ?? 0,
        naoSeguidores: r.nonFollowersPct,
      })),
    [current]
  );

  const table = useMemo(() => [...(rows ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [rows]);

  if (rows === null) {
    return <div className="card p-8 text-center text-sm text-slate-500">Carregando Instagram…</div>;
  }

  const inputCls =
    "w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-200 outline-none transition hover:border-line focus:border-brand-500/60 focus:bg-ink-900 focus:ring-2 focus:ring-brand-500/20";

  const charts: { title: string; key: string; label: string; format?: "pct" }[] = [
    { title: "Crescimento de seguidores", key: "seguidores", label: "Seguidores" },
    { title: "Evolução de visualizações", key: "visualizacoes", label: "Visualizações" },
    { title: "Engajamento ao longo do tempo", key: "engajamento", label: "Engajamento", format: "pct" },
    { title: "% de não seguidores (expansão de público)", key: "naoSeguidores", label: "Não seguidores", format: "pct" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pt-2">
        <Instagram size={18} className="text-violet" />
        <h2 className="text-base font-bold text-slate-100">Instagram</h2>
        <span className="text-xs text-slate-500">métricas do perfil, estilo Insights — seguem o período selecionado acima</span>
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Seguidores"
          value={last ? num(last.followers) : "—"}
          delta={growth}
          hint={growth !== undefined ? "crescimento no período" : "lance 2+ dias para ver o crescimento"}
          accent="violet"
        />
        <StatCard label="Visualizações" value={num(totalViews)} hint="total no período" accent="brand" />
        <StatCard label="Alcance" value={num(totalReach)} hint="total no período" accent="grow" />
        <StatCard
          label="Engajamento"
          value={fmtPct(avgEngagement)}
          hint="(curtidas + comentários + compart. + salvos) / alcance"
          accent="warn"
        />
      </div>

      {/* Gráficos estilo Insights */}
      <div className="grid gap-5 lg:grid-cols-2">
        {charts.map((c) => (
          <div key={c.key} className="card p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-200">{c.title}</h3>
            {chartData.length >= 2 ? (
              <TrendChart data={chartData} series={[{ key: c.key, label: c.label }]} format={c.format ?? "number"} height={200} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">Lance pelo menos dois dias de dados no período.</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabela editável */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-200">Lançamentos do Instagram</h3>
          <span className={cn("text-xs", save.state === "error" ? "font-semibold text-danger" : "text-slate-500")}>
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
            {editable
              ? "Nenhum lançamento ainda. Clique em “Adicionar linha” para registrar o primeiro dia."
              : "Nenhum dado de Instagram lançado ainda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2.5 font-medium">Data</th>
                  <th className="px-2 py-2.5 font-medium">Visualizações</th>
                  <th className="px-2 py-2.5 font-medium">Curtidas</th>
                  <th className="px-2 py-2.5 font-medium">Comentários</th>
                  <th className="px-2 py-2.5 font-medium">Compart.</th>
                  <th className="px-2 py-2.5 font-medium">Salvos</th>
                  <th className="px-2 py-2.5 font-medium">Seguidores</th>
                  <th className="px-2 py-2.5 font-medium">Alcance</th>
                  <th className="px-2 py-2.5 font-medium">% Não seg.</th>
                  <th className="px-2 py-2.5 font-medium text-violet">Engajamento</th>
                  {editable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.id} className="border-b border-line/50 transition hover:bg-ink-800/40">
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
                        {NUM_FIELDS.map(([field]) => (
                          <td key={field} className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={r[field] || ""}
                              placeholder="0"
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                edit(r.id, { [field]: Number.isFinite(v) && v >= 0 ? Math.round(v) : 0 });
                              }}
                              className={cn(inputCls, "min-w-[84px]")}
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            defaultValue={r.nonFollowersPct || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              edit(r.id, { nonFollowersPct: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0 });
                            }}
                            className={cn(inputCls, "min-w-[64px]")}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2.5 text-slate-300">{r.date.split("-").reverse().join("/")}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.views)}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.likes)}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.comments)}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.shares)}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.saves)}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.followers)}</td>
                        <td className="px-2 py-2.5 text-slate-300">{num(r.reach)}</td>
                        <td className="px-2 py-2.5 text-slate-400">{fmtPct(r.nonFollowersPct)}</td>
                      </>
                    )}
                    <td className="px-2 py-2.5 text-xs font-semibold text-violet">{fmtPct(engagementOf(r))}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
