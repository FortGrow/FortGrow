"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

export type PlanDTO = {
  id: string;
  name: string;
  pricingModel: "FIXO" | "VARIAVEL" | "HIBRIDO";
  price: number;
  variablePercent: number | null;
  variableBasis: string | null;
  description: string | null;
  deliverables: string[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const PRICING_MODELS = [
  { key: "FIXO", label: "Fixo", hint: "valor fechado por mês" },
  { key: "VARIAVEL", label: "Variável", hint: "percentual sobre algo (ex.: investimento em mídia)" },
  { key: "HIBRIDO", label: "Fixo + Variável", hint: "uma parte fixa e uma parte percentual" },
] as const;

function pricingLabel(p: Pick<PlanDTO, "pricingModel" | "price" | "variablePercent" | "variableBasis">) {
  const pct = p.variablePercent !== null ? `${p.variablePercent}%${p.variableBasis ? ` ${p.variableBasis}` : ""}` : null;
  if (p.pricingModel === "FIXO") return `${brl(p.price)}/mês`;
  if (p.pricingModel === "VARIAVEL") return pct ?? "variável";
  return `${brl(p.price)}/mês + ${pct ?? "variável"}`;
}

/** Planos/pacotes da FortGrow — fixo, variável (% sobre algo) ou híbrido; usados no cadastro de clientes. */
export function PlansPanel({ plans }: { plans: PlanDTO[] }) {
  const [open, setOpen] = useState(false);
  const [pricingModel, setPricingModel] = useState<"FIXO" | "VARIAVEL" | "HIBRIDO">("FIXO");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function closeModal() {
    setOpen(false);
    setPricingModel("FIXO");
    setError(null);
  }

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
          description: form.get("description") || undefined,
          pricingModel,
          price: form.get("price") || undefined,
          variablePercent: form.get("variablePercent") || undefined,
          variableBasis: form.get("variableBasis") || undefined,
          deliverables,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      closeModal();
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
            Pacotes fixos, variáveis (% sobre algo) ou híbridos, com as entregas incluídas — aparecem na seleção de
            plano ao cadastrar/editar clientes e no portal de cada cliente.
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
              <p className="text-lg font-bold text-brand-400">{pricingLabel(p)}</p>
              <span
                className={cn(
                  "mt-1.5 inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  p.pricingModel === "FIXO" && "bg-brand-500/15 text-brand-300",
                  p.pricingModel === "VARIAVEL" && "bg-warn/15 text-warn",
                  p.pricingModel === "HIBRIDO" && "bg-violet/15 text-violet"
                )}
              >
                {PRICING_MODELS.find((m) => m.key === p.pricingModel)?.label}
              </span>
              {p.description && <p className="mt-2 text-xs text-slate-500">{p.description}</p>}
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
              <div>
                <label className="label" htmlFor="pl-name">Nome do plano *</label>
                <input id="pl-name" name="name" required minLength={2} className="input" placeholder="Ex.: Growth Plus" />
              </div>

              <div>
                <label className="label">Modelo de precificação *</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRICING_MODELS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPricingModel(m.key)}
                      className={cn(
                        "rounded-xl border px-2.5 py-2 text-left text-xs transition",
                        pricingModel === m.key
                          ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
                          : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
                      )}
                    >
                      <span className="block font-semibold">{m.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">{m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(pricingModel === "FIXO" || pricingModel === "HIBRIDO") && (
                <div>
                  <label className="label" htmlFor="pl-price">Valor fixo mensal (R$) *</label>
                  <input id="pl-price" name="price" type="number" min="0" step="0.01" required className="input" placeholder="8500" />
                </div>
              )}

              {(pricingModel === "VARIAVEL" || pricingModel === "HIBRIDO") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="pl-pct">Percentual variável (%) *</label>
                    <input
                      id="pl-pct"
                      name="variablePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      className="input"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="pl-basis">Sobre o quê?</label>
                    <input id="pl-basis" name="variableBasis" className="input" placeholder="sobre investimento em mídia" />
                  </div>
                </div>
              )}

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
              <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
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
