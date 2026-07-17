"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type PlanDTO = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  deliverables: string[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Planos/pacotes da FortGrow — personalizáveis, usados no cadastro de clientes. */
export function PlansPanel({ plans }: { plans: PlanDTO[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const deliverables = String(form.get("deliverables") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          price: form.get("price") || undefined,
          description: form.get("description") || undefined,
          deliverables,
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
      await fetch(`/api/plans?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <Package size={15} className="text-brand-400" /> Planos FortGrow
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Seus pacotes comerciais com as entregas incluídas — aparecem na seleção de plano ao cadastrar clientes e no
            portal de cada cliente.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={15} /> Novo plano
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">
          Nenhum plano cadastrado — crie os pacotes que a FortGrow oferece hoje.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-bold text-slate-100">{p.name}</p>
                <button
                  onClick={() => remove(p.id)}
                  disabled={removing === p.id}
                  title="Excluir plano"
                  className="rounded-lg p-1.5 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                >
                  {removing === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
              {p.price > 0 && <p className="text-lg font-bold text-brand-400">{brl(p.price)}<span className="text-xs font-medium text-slate-500">/mês</span></p>}
              {p.description && <p className="mt-1 text-xs text-slate-500">{p.description}</p>}
              {p.deliverables.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {p.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <Check size={13} className="mt-0.5 shrink-0 text-grow-400" /> {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={onCreate} className="card w-full max-w-lg animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Novo plano FortGrow</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="pl-name">Nome do plano *</label>
                  <input id="pl-name" name="name" required minLength={2} className="input" placeholder="Ex.: Growth Plus" />
                </div>
                <div>
                  <label className="label" htmlFor="pl-price">Valor mensal (R$)</label>
                  <input id="pl-price" name="price" type="number" min="0" step="0.01" className="input" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="pl-desc">Descrição</label>
                <input id="pl-desc" name="description" className="input" placeholder="Para quem é este pacote" />
              </div>
              <div>
                <label className="label" htmlFor="pl-deliv">Entregas incluídas (uma por linha)</label>
                <textarea
                  id="pl-deliv"
                  name="deliverables"
                  rows={6}
                  className="input"
                  placeholder={"Gestão de tráfego (Google + Meta)\n12 posts/mês no Instagram\n4 Reels/mês\nRelatório mensal de resultados\nReunião quinzenal de alinhamento"}
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Criar plano
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
