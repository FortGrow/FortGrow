"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Loader2, SlidersHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LEAD_SOURCES,
  PROSPECT_STATUSES,
  FUNNEL_STAGES,
  normalizeLeadSource,
  cardGradient,
} from "@/lib/lead-taxonomy";
import { EditLeadForm, type EditableLead } from "@/app/admin/prospeccao/edit-lead-form";

export type UnifiedLead = EditableLead & {
  stage: string;
  prospectStatus: string;
  firstContactAt: string | null; // yyyy-mm-dd
  createdAt: string; // ISO
  ownerName: string | null;
};

const POTENTIALS = ["Baixo", "Médio", "Alto"] as const;

/** Prospecção: a cor do card vem do potencial de fechamento (vermelho/azul/verde). */
const POTENTIAL_COLORS: Record<string, string> = {
  Baixo: "#dc2626",
  "Médio": "#0284c7",
  Alto: "#059669",
};
const PERIODS = [
  { dias: 0, label: "Tudo" },
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "90 dias" },
];

/**
 * Padrão unificado Prospecção + CRM Comercial: os dois usam exatamente o
 * mesmo card (nome, 1º contato, origem, observações editáveis direto no
 * card), mudando apenas o conjunto de status que colore o fundo —
 * prospecção = entrada do lead; CRM = evolução até o fechamento (com valor
 * potencial). Tudo salva sozinho no banco (debounce nos textos).
 */
export function LeadCardGrid({ leads: initial, mode }: { leads: UnifiedLead[]; mode: "prospeccao" | "crm" }) {
  const [leads, setLeads] = useState(initial);
  const [period, setPeriod] = useState(0);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, setBusy] = useState<string | null>(null);
  // Filtros recolhidos por padrão — menos poluição visual; abrem só quando o usuário clica
  const [filtersOpen, setFiltersOpen] = useState(false);

  const STATUSES = mode === "prospeccao" ? PROSPECT_STATUSES : FUNNEL_STAGES;
  const statusOf = (l: UnifiedLead) => (mode === "prospeccao" ? l.prospectStatus : l.stage);
  const statusField = mode === "prospeccao" ? "prospectStatus" : "stage";
  /* Cor do card: prospecção = potencial de fechamento; CRM = etapa do funil */
  const cardColor = (l: UnifiedLead) =>
    mode === "prospeccao"
      ? POTENTIAL_COLORS[l.potential ?? "Médio"] ?? POTENTIAL_COLORS["Médio"]
      : (STATUSES.find((s) => s.key === statusOf(l)) ?? STATUSES[0]).color;

  /* Autosave com debounce (textos/datas/valores); selects salvam na hora */
  const pending = useRef<Map<string, Record<string, unknown>>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    const batch = [...pending.current.entries()];
    pending.current.clear();
    if (!batch.length) return;
    setSave("saving");
    try {
      for (const [id, patch] of batch) {
        const res = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        });
        if (!res.ok) throw new Error();
      }
      setSave("saved");
    } catch {
      setSave("error");
    }
  }

  function edit(id: string, patch: Record<string, unknown>, immediate = false) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, immediate ? 50 : 700);
  }

  async function setPotential(id: string, potential: string) {
    setBusy(id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, potential } : l)));
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, potential }),
      });
    } finally {
      setBusy(null);
    }
  }

  /* Filtros: período (pela data do 1º contato), origem e status */
  const visible = useMemo(() => {
    const since = period > 0 ? Date.now() - period * 86400000 : 0;
    return leads.filter((l) => {
      const ref = l.firstContactAt ? new Date(`${l.firstContactAt}T12:00:00Z`).getTime() : new Date(l.createdAt).getTime();
      if (ref < since) return false;
      if (source && normalizeLeadSource(l.source) !== source) return false;
      if (status && statusOf(l) !== status) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, period, source, status, mode]);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
      active
        ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
        : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
    );

  const fieldCls =
    "w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-xs text-white placeholder-white/45 outline-none transition focus:border-white/40 focus:bg-black/40";

  /* Resumo dos filtros ativos (só os que fogem do padrão) — some no botão quando recolhido */
  const activeSummary = [
    period > 0 ? PERIODS.find((p) => p.dias === period)?.label : null,
    source ? LEAD_SOURCES.find((s) => s.key === source)?.label : null,
    status ? STATUSES.find((s) => s.key === status)?.label : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {/* Filtros: recolhidos por padrão — abrem só ao clicar, pra não poluir a tela */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
            filtersOpen || activeSummary.length > 0
              ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
              : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
          )}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {activeSummary.length > 0 && (
            <span className="rounded-full bg-brand-500/25 px-1.5 py-0.5 text-[10px] font-bold">
              {activeSummary.length}
            </span>
          )}
          <ChevronDown size={13} className={cn("transition-transform", filtersOpen && "rotate-180")} />
        </button>
        {!filtersOpen && activeSummary.length > 0 && (
          <span className="truncate text-xs text-slate-500">{activeSummary.join(" · ")}</span>
        )}
        <span
          className={cn("ml-auto text-xs", save === "error" ? "font-semibold text-danger" : "text-slate-500")}
        >
          {save === "saving" && "Salvando…"}
          {save === "saved" && "Salvo automaticamente"}
          {save === "error" && "Erro ao salvar — tente novamente."}
        </span>
      </div>

      {filtersOpen && (
        <div className="space-y-3 rounded-2xl border border-line/60 bg-ink-900/40 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Período:</span>
            {PERIODS.map((p) => (
              <button key={p.dias} onClick={() => setPeriod(p.dias)} className={chip(period === p.dias)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Origem:</span>
            <button onClick={() => setSource("")} className={chip(source === "")}>Todas</button>
            {LEAD_SOURCES.map((s) => (
              <button key={s.key} onClick={() => setSource(s.key)} className={chip(source === s.key)}>
                {s.label} ({leads.filter((l) => normalizeLeadSource(l.source) === s.key).length})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status:</span>
            <button onClick={() => setStatus("")} className={chip(status === "")}>Todos</button>
            {STATUSES.map((s) => (
              <button key={s.key} onClick={() => setStatus(s.key)} className={chip(status === s.key)}>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} ({leads.filter((l) => statusOf(l) === s.key).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cards coloridos pelo status — mesmo layout nas duas seções */}
      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">Nenhum lead neste filtro.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => {
            const color = cardColor(l);
            return (
              <div
                key={l.id}
                className="group relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: cardGradient(color) }}
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

                <div className="mt-3 space-y-2">
                  {/* Data do primeiro contato */}
                  <label className="flex items-center gap-1.5 text-[11px] text-white/75">
                    <CalendarDays size={12} className="shrink-0" /> 1º contato
                    <input
                      type="date"
                      defaultValue={l.firstContactAt ?? l.createdAt.slice(0, 10)}
                      onChange={(e) => e.target.value && edit(l.id, { firstContactAt: e.target.value })}
                      className={cn(fieldCls, "!w-auto flex-1")}
                    />
                  </label>

                  {/* Origem do lead */}
                  <select
                    value={normalizeLeadSource(l.source)}
                    onChange={(e) => edit(l.id, { source: e.target.value }, true)}
                    className={cn(fieldCls, "cursor-pointer")}
                    title="Origem do lead"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s.key} value={s.key} className="bg-ink-900 text-slate-200">
                        Origem: {s.label}
                      </option>
                    ))}
                  </select>

                  {/* CRM: valor potencial */}
                  {mode === "crm" && (
                    <label className="flex items-center gap-1.5 text-[11px] text-white/75">
                      R$
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        defaultValue={l.estimatedValue || ""}
                        placeholder="Valor potencial"
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          edit(l.id, { estimatedValue: Number.isFinite(v) && v >= 0 ? v : 0 });
                        }}
                        className={cn(fieldCls, "flex-1")}
                      />
                    </label>
                  )}

                  {/* Observações editáveis direto no card */}
                  <textarea
                    rows={2}
                    defaultValue={l.notes ?? ""}
                    placeholder="Observações…"
                    onChange={(e) => edit(l.id, { notes: e.target.value })}
                    className={cn(fieldCls, "resize-none")}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {/* Evolução do status — única diferença entre as duas seções */}
                  <select
                    value={statusOf(l)}
                    onChange={(e) => edit(l.id, { [statusField]: e.target.value }, true)}
                    className={cn(fieldCls, "!w-auto max-w-[60%] cursor-pointer font-semibold")}
                    title={mode === "prospeccao" ? "Status do lead" : "Etapa do funil"}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key} className="bg-ink-900 text-slate-200">
                        {s.label}
                      </option>
                    ))}
                  </select>

                  {mode === "prospeccao" ? (
                    <div className="flex overflow-hidden rounded-lg bg-black/25 text-[10px] font-bold">
                      {POTENTIALS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPotential(l.id, p)}
                          disabled={busy === l.id}
                          title={`Potencial ${p}`}
                          className={cn(
                            "px-2 py-1 transition",
                            (l.potential ?? "Médio") === p ? "bg-white/90 text-ink-900" : "text-white/70 hover:bg-white/15"
                          )}
                        >
                          {busy === l.id && (l.potential ?? "Médio") === p ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            p[0]
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    l.ownerName && (
                      <p className="flex items-center gap-1 text-[11px] text-white/75">
                        <User size={11} /> {l.ownerName}
                      </p>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
