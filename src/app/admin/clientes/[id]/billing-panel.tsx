"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Badge, StatusBadge } from "@/components/ui/badge";

export type SubscriptionDto = {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  startDate: string;
  dueDay: number;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
};

export type ChargeDto = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
  method: string | null;
};

const FREQ_LABELS: Record<string, string> = { MENSAL: "Mensal", TRIMESTRAL: "Trimestral", ANUAL: "Anual" };
const METHOD_LABELS: Record<string, string> = { PIX: "PIX", BOLETO: "Boleto", CARTAO: "Cartão", TRANSFERENCIA: "Transferência" };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function dueBadge(c: ChargeDto) {
  if (c.status !== "EM_ABERTO") return null;
  const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge tone="danger">vencida</Badge>;
  if (days <= 5) return <Badge tone="warn">vence em {days === 0 ? "hoje" : `${days}d`}</Badge>;
  return null;
}

/** Formulário de mensalidade (criação e edição). */
function SubscriptionForm({
  clientId,
  initial,
  onClose,
}: {
  clientId: string;
  initial?: SubscriptionDto;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = initial ? { id: initial.id } : { clientId };
    for (const [k, v] of form.entries()) payload[k] = v;
    try {
      const res = await fetch("/api/subscriptions", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(onClose, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">
          {initial ? "Editar mensalidade" : "Nova mensalidade"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="sb-description">Descrição</label>
            <input id="sb-description" name="description" defaultValue={initial?.description ?? "Mensalidade"} required minLength={2} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sb-amount">Valor (R$) *</label>
            <input id="sb-amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={initial?.amount} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sb-frequency">Frequência</label>
            <select id="sb-frequency" name="frequency" defaultValue={initial?.frequency ?? "MENSAL"} className="input">
              {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sb-startDate">Data de início *</label>
            <input
              id="sb-startDate"
              name="startDate"
              type="date"
              required
              defaultValue={(initial?.startDate ?? new Date().toISOString()).slice(0, 10)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="sb-dueDay">Dia do vencimento</label>
            <input id="sb-dueDay" name="dueDay" type="number" min="1" max="31" defaultValue={initial?.dueDay ?? 5} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sb-paymentMethod">Forma de pagamento</label>
            <select id="sb-paymentMethod" name="paymentMethod" defaultValue={initial?.paymentMethod ?? ""} className="input">
              <option value="">—</option>
              {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {initial && (
            <div>
              <label className="label" htmlFor="sb-status">Status</label>
              <select id="sb-status" name="status" defaultValue={initial.status} className="input">
                <option value="ATIVA">Ativa</option>
                <option value="PAUSADA">Pausada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="sb-notes">Observações</label>
            <textarea id="sb-notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="input" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
              <CheckCircle2 size={15} /> Salvo com sucesso!
            </span>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Salvar
          </button>
        </div>
      </form>
    </Overlay>
  );
}

/** Painel financeiro do cliente: mensalidades + histórico de cobranças. */
export function BillingPanel({
  clientId,
  subscriptions,
  charges,
  totalPaid,
  totalPending,
}: {
  clientId: string;
  subscriptions: SubscriptionDto[];
  charges: ChargeDto[];
  totalPaid: number;
  totalPending: number;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SubscriptionDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function call(input: RequestInfo, init: RequestInit, okMsg: string, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível concluir.");
        return;
      }
      setFeedback(okMsg);
      router.refresh();
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setBusy(null);
    }
  }

  const markPaid = (id: string) =>
    call(
      "/api/invoices",
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "PAGO" }) },
      "Cobrança marcada como paga!",
      `pay-${id}`
    );

  const deleteSub = (id: string) =>
    call(`/api/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "Mensalidade excluída.", `del-${id}`);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
          <CircleDollarSign size={15} className="text-grow-400" /> Mensalidades & Cobranças
        </h2>
        <button onClick={() => setCreating(true)} className="btn-ghost py-1.5 text-xs">
          <Plus size={13} /> Nova mensalidade
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-grow-500/5 p-3 ring-1 ring-inset ring-grow-500/15">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total já pago (LTV)</p>
          <p className="mt-0.5 text-lg font-bold text-grow-400">{brl(totalPaid)}</p>
        </div>
        <div className="rounded-xl bg-warn/5 p-3 ring-1 ring-inset ring-warn/15">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">A receber</p>
          <p className="mt-0.5 text-lg font-bold text-warn">{brl(totalPending)}</p>
        </div>
      </div>

      {/* Mensalidades */}
      {subscriptions.length === 0 ? (
        <p className="mb-4 text-xs text-slate-500">
          Nenhuma mensalidade cadastrada — as cobranças recorrentes são geradas a partir daqui.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {subscriptions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-900/40 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-200">
                  {s.description}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {FREQ_LABELS[s.frequency] ?? s.frequency} · vence dia {s.dueDay}
                    {s.paymentMethod ? ` · ${METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}` : ""}
                  </span>
                </p>
                <p className="text-xs text-slate-500">desde {dt(s.startDate)}{s.notes ? ` — ${s.notes}` : ""}</p>
              </div>
              <span className="text-sm font-bold text-slate-100">{brl(s.amount)}</span>
              <StatusBadge status={s.status} />
              <button
                onClick={() => setEditing(s)}
                title="Editar mensalidade"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-brand-300"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteSub(s.id)}
                disabled={busy === `del-${s.id}`}
                title="Excluir mensalidade (o histórico de cobranças fica)"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              >
                {busy === `del-${s.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Histórico de cobranças */}
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Histórico de cobranças</h3>
      {charges.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhuma cobrança ainda.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line/60">
              {charges.map((c) => (
                <tr key={c.id} className="transition hover:bg-ink-800/50">
                  <td className="max-w-44 truncate px-3 py-2 text-slate-300">{c.description}</td>
                  <td className="px-3 py-2 font-semibold text-slate-200">{brl(c.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {c.status === "PAGO" && c.paidAt ? `pago ${dt(c.paidAt)}` : `vence ${dt(c.dueDate)}`}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {dueBadge(c)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(c.status === "EM_ABERTO" || c.status === "ATRASADO") && (
                      <button
                        onClick={() => markPaid(c.id)}
                        disabled={busy === `pay-${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-grow-500/10 px-2 py-1 text-[11px] font-semibold text-grow-400 ring-1 ring-inset ring-grow-500/20 transition hover:bg-grow-500/20 disabled:opacity-40"
                      >
                        {busy === `pay-${c.id}` ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
                        Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {feedback && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
          <CheckCircle2 size={15} /> {feedback}
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

      {creating && <SubscriptionForm clientId={clientId} onClose={() => setCreating(false)} />}
      {editing && <SubscriptionForm clientId={clientId} initial={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
