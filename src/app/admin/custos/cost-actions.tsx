"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { COST_CATEGORY_LABELS } from "@/lib/cost-categories";

export function NewCostForm() {
  const [open, setOpen] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.get("description"),
          category: form.get("category"),
          amount: form.get("amount"),
          recurring,
          frequency: recurring ? form.get("frequency") : "unica",
          date: form.get("date"),
          status: form.get("status"),
          notes: form.get("notes") || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={15} /> Novo custo
      </button>
    );
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Novo custo</h2>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="co-description">Nome do custo *</label>
            <input id="co-description" name="description" required minLength={2} className="input" placeholder="Ex.: Assinatura Google Workspace" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="co-category">Categoria *</label>
              <select id="co-category" name="category" required className="input">
                {Object.entries(COST_CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="co-amount">Valor (R$) *</label>
              <input id="co-amount" name="amount" type="number" min="0.01" step="0.01" required className="input" />
            </div>
          </div>
          <div>
            <label className="label">Recorrente?</label>
            <div className="flex gap-2">
              {(
                [
                  [false, "Não (custo único)"],
                  [true, "Sim (recorrente)"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setRecurring(v)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    recurring === v
                      ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                      : "bg-ink-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {recurring && (
              <div>
                <label className="label" htmlFor="co-frequency">Frequência *</label>
                <select id="co-frequency" name="frequency" className="input" defaultValue="mensal">
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="co-date">Vencimento *</label>
              <input id="co-date" name="date" type="date" required className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="label" htmlFor="co-status">Status</label>
              <select id="co-status" name="status" className="input" defaultValue="ATIVO">
                <option value="ATIVO">Ativo</option>
                <option value="PAGO">Pago</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="co-notes">Observações</label>
            <textarea id="co-notes" name="notes" rows={2} className="input" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Cadastrar custo
          </button>
        </div>
      </form>
    </Overlay>
  );
}

export function CostRowActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function setStatus(next: string) {
    setLoading(true);
    try {
      await fetch("/api/costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    try {
      await fetch(`/api/costs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={loading}
        className="rounded-lg border border-line bg-ink-900 px-2 py-1 text-[11px] font-semibold text-slate-300"
      >
        <option value="ATIVO">ATIVO</option>
        <option value="PAGO">PAGO</option>
        <option value="CANCELADO">CANCELADO</option>
      </select>
      <button
        onClick={remove}
        disabled={loading}
        title="Excluir custo"
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  );
}
