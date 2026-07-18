"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, FileText, Loader2, MapPin, User } from "lucide-react";
import { DeleteClientButton } from "./delete-client-button";

export type ClientCardDto = {
  id: string;
  companyName: string;
  segment: string | null;
  plan: string | null;
  billingType: string;
  monthlyValue: number;
  commissionBase: number;
  commissionShare: number;
  city: string | null;
  state: string | null;
  status: string;
  managerName: string | null;
  projects: number;
  contracts: number;
  contractStart: string | null;
};

const STATUSES = ["ATIVO", "ONBOARDING", "PAUSADO", "INATIVO"] as const;

/** Cor de fundo completa do card por status do cliente. */
const STATUS_STYLE: Record<string, { bg: string; solid: string; label: string }> = {
  ATIVO: { bg: "linear-gradient(140deg, #059669d9, #047857cc)", solid: "#059669", label: "Ativo" },
  ONBOARDING: { bg: "linear-gradient(140deg, #0284c7d9, #075985cc)", solid: "#0284c7", label: "Onboarding" },
  PAUSADO: { bg: "linear-gradient(140deg, #d97706d9, #b45309cc)", solid: "#d97706", label: "Pausado" },
  INATIVO: { bg: "linear-gradient(140deg, #dc2626d9, #991b1bcc)", solid: "#dc2626", label: "Inativo" },
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Carteira de clientes em cards coloridos por status — mesmo visual da Prospecção. */
export function ClientsBoard({ clients: initial }: { clients: ClientCardDto[] }) {
  const [clients, setClients] = useState(initial);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const metrics = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, clients.filter((c) => c.status === s).length]));
    const mrr = clients
      .filter((c) => c.status === "ATIVO" || c.status === "ONBOARDING")
      .reduce((s, c) => s + c.monthlyValue, 0);
    return { total: clients.length, byStatus, mrr };
  }, [clients]);

  const visible = useMemo(() => (filter ? clients.filter((c) => c.status === filter) : clients), [clients, filter]);

  async function setStatus(id: string, status: string) {
    setSaving(id);
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
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
      {/* Mini painel */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Clientes na carteira</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{metrics.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ativos</p>
          <p className="mt-1 text-2xl font-bold text-grow-400">{metrics.byStatus.ATIVO}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{metrics.byStatus.ONBOARDING} em onboarding</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mensalidades (contratos)</p>
          <p className="mt-1 text-2xl font-bold text-brand-300">{brl(metrics.mrr)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">ativos + onboarding</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Atenção</p>
          <p className="mt-1 text-2xl font-bold text-warn">{metrics.byStatus.PAUSADO + metrics.byStatus.INATIVO}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {metrics.byStatus.PAUSADO} pausado(s) · {metrics.byStatus.INATIVO} inativo(s)
          </p>
        </div>
      </div>

      {/* Filtro por status */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("")} className={pill(filter === "")}>Todos ({clients.length})</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={pill(filter === s)}>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_STYLE[s].solid }} />
            {STATUS_STYLE[s].label} ({metrics.byStatus[s]})
          </button>
        ))}
      </div>

      {/* Cards coloridos */}
      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">Nenhum cliente neste filtro.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => {
            const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.ATIVO;
            return (
              <div
                key={c.id}
                className="group relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: style.bg }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.companyName}</p>
                    <p className="truncate text-xs text-white/80">{c.segment ?? "—"}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                    {style.label}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-white/85">
                  <p className="font-semibold text-white">
                    {c.billingType === "COMISSAO"
                      ? `Comissão ${c.commissionBase}% × ${c.commissionShare}%${c.monthlyValue > 0 ? ` + ${brl(c.monthlyValue)}/mês` : ""}`
                      : `${brl(c.monthlyValue)}/mês`}
                  </p>
                  {c.plan && <p className="truncate">{c.plan}</p>}
                  {(c.city || c.state) && (
                    <p className="flex items-center gap-1.5"><MapPin size={11} /> {c.city}{c.state ? `/${c.state}` : ""}</p>
                  )}
                  {c.managerName && <p className="flex items-center gap-1.5"><User size={11} /> {c.managerName}</p>}
                  <p className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Briefcase size={11} /> {c.projects} projeto(s)</span>
                    <span className="flex items-center gap-1"><FileText size={11} /> {c.contracts} contrato(s)</span>
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/clientes/${c.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-900 transition hover:bg-white"
                  >
                    Abrir <ArrowRight size={11} />
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {/* Troca rápida de status */}
                    <div className="flex overflow-hidden rounded-lg bg-black/25 text-[10px] font-bold">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(c.id, s)}
                          disabled={saving === c.id}
                          title={STATUS_STYLE[s].label}
                          className={`px-1.5 py-1 transition ${
                            c.status === s ? "bg-white/90 text-ink-900" : "text-white/70 hover:bg-white/15"
                          }`}
                        >
                          {saving === c.id && c.status === s ? <Loader2 size={10} className="animate-spin" /> : s[0]}
                        </button>
                      ))}
                    </div>
                    <span className="[&_button]:!text-white/80 [&_button:hover]:!bg-black/35 [&_button]:!bg-black/20 [&_button]:rounded-lg [&_button]:p-1.5">
                      <DeleteClientButton clientId={c.id} companyName={c.companyName} />
                    </span>
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
