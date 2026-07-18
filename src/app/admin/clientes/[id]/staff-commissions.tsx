"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Loader2, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type StaffCommissionDTO = {
  id: string;
  userId: string;
  userName: string;
  type: string;
  value: number;
  note: string | null;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Bloco "Comissões" da ficha do cliente: colaboradores comissionados nesta conta. */
export function StaffCommissionsPanel({
  clientId,
  commissions,
  staff,
}: {
  clientId: string;
  commissions: StaffCommissionDTO[];
  staff: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"PERCENTUAL" | "FIXO">("PERCENTUAL");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/staff-commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          userId: form.get("userId"),
          type,
          value: form.get("value"),
          note: form.get("note") || undefined,
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

  async function remove(id: string) {
    setRemoving(id);
    try {
      await fetch(`/api/staff-commissions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <HandCoins size={15} className="text-grow-400" /> Comissões
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Colaboradores comissionados nesta conta — o cálculo é automático sobre a receita paga do mês
            (percentual) ou valor fixo mensal. Acompanhe em <span className="font-semibold text-slate-400">Comissões</span>.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={15} /> Adicionar colaborador
        </button>
      </div>

      {commissions.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum colaborador comissionado neste cliente.</p>
      ) : (
        <div className="divide-y divide-line/60">
          {commissions.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-200">{c.userName}</p>
                <p className="text-xs text-slate-500">
                  Comissão:{" "}
                  <span className="font-semibold text-grow-400">
                    {c.type === "PERCENTUAL" ? `${c.value}%` : `${brl(c.value)}/mês`}
                  </span>
                  {c.note && ` · ${c.note}`}
                </p>
              </div>
              <button
                onClick={() => remove(c.id)}
                disabled={removing === c.id}
                title="Remover comissão"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
              >
                {removing === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={onCreate} className="card w-full max-w-md animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Comissionar colaborador</h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="sc-user">Colaborador *</label>
                <select id="sc-user" name="userId" required className="input">
                  <option value="">Selecione…</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo da comissão *</label>
                <div className="flex gap-2">
                  {(
                    [
                      ["PERCENTUAL", "Percentual (%)"],
                      ["FIXO", "Valor fixo (R$)"],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setType(v)}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        type === v
                          ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                          : "bg-ink-800 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="sc-value">
                  {type === "PERCENTUAL" ? "Percentual sobre a receita (%) *" : "Valor fixo mensal (R$) *"}
                </label>
                <input
                  id="sc-value"
                  name="value"
                  type="number"
                  min="0.01"
                  max={type === "PERCENTUAL" ? 100 : undefined}
                  step="0.01"
                  required
                  className="input"
                  placeholder={type === "PERCENTUAL" ? "ex.: 15" : "ex.: 450"}
                />
              </div>
              <div>
                <label className="label" htmlFor="sc-note">Observação (opcional)</label>
                <input id="sc-note" name="note" className="input" />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar comissão
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
