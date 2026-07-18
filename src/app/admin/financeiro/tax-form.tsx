"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Percent } from "lucide-react";

/** Percentual de imposto sobre a receita — editável direto no painel. */
export function TaxPercentForm({ current }: { current: number }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxPercent: form.get("taxPercent") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => { setEditing(false); setSaved(false); }, 900);
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Alterar o percentual de imposto"
        className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 ring-1 ring-inset ring-line transition hover:text-slate-200"
      >
        <Percent size={12} /> Imposto: {current}% — editar
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="inline-flex items-center gap-2">
      <input
        name="taxPercent"
        type="number"
        min="0"
        max="100"
        step="0.01"
        required
        defaultValue={current}
        autoFocus
        className="input w-24 py-1.5 text-xs"
      />
      <span className="text-xs text-slate-500">%</span>
      <button type="submit" disabled={loading} className="btn-primary py-1.5 text-xs">
        {loading ? <Loader2 size={12} className="animate-spin" /> : "Salvar"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="btn-ghost py-1.5 text-xs">Cancelar</button>
      {saved && <CheckCircle2 size={14} className="text-grow-400" />}
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </form>
  );
}
