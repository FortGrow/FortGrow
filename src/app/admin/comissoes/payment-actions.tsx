"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil, Trash2, Undo2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/**
 * Ações sobre um pagamento de comissão já registrado:
 * corrigir valor/data ou desfazer (excluir) — mesmo depois de pago.
 */
export function PaymentActions({
  expenseId,
  description,
  amount,
  date,
  compact = false,
}: {
  expenseId: string;
  description: string;
  amount: number;
  date: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/commission-payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: expenseId, amount: form.get("amount"), date: form.get("date") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => { setEditing(false); setSaved(false); }, 800);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/commission-payments?id=${encodeURIComponent(expenseId)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível desfazer.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <span className="inline-flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          title="Corrigir pagamento (valor/data)"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-brand-300"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          disabled={busy === "delete"}
          title="Desfazer pagamento (volta a pendente)"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
        >
          {busy === "delete" ? <Loader2 size={13} className="animate-spin" /> : compact ? <Undo2 size={13} /> : <Trash2 size={13} />}
        </button>
      </span>
      {error && !editing && <p className="mt-1 text-[11px] font-medium text-danger">{error}</p>}

      {editing && (
        <Overlay>
          <form onSubmit={onSave} className="card w-full max-w-sm animate-fade-up p-6">
            <h2 className="mb-1 text-lg font-bold text-slate-100">Corrigir pagamento</h2>
            <p className="mb-4 text-xs text-slate-500">{description}</p>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor={`pa-amount-${expenseId}`}>Valor (R$)</label>
                <input
                  id={`pa-amount-${expenseId}`}
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={amount}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor={`pa-date-${expenseId}`}>Data do pagamento</label>
                <input
                  id={`pa-date-${expenseId}`}
                  name="date"
                  type="date"
                  required
                  defaultValue={date.slice(0, 10)}
                  className="input"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                  <CheckCircle2 size={15} /> Corrigido!
                </span>
              )}
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={busy === "save"} className="btn-primary">
                {busy === "save" && <Loader2 size={15} className="animate-spin" />} Salvar correção
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}
