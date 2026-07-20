"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

export type ServiceDTO = {
  id: string;
  name: string;
  description: string | null;
  pricingModel: "FIXO" | "VARIAVEL" | "HIBRIDO";
  basePrice: number;
  variablePercent: number | null;
  variableBasis: string | null;
  clientCount: number;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const PRICING_MODELS = [
  { key: "FIXO", label: "Fixo", hint: "valor fechado por mês" },
  { key: "VARIAVEL", label: "Variável", hint: "percentual sobre algo (ex.: investimento em mídia)" },
  { key: "HIBRIDO", label: "Fixo + Variável", hint: "uma parte fixa e uma parte percentual" },
] as const;

function pricingLabel(s: Pick<ServiceDTO, "pricingModel" | "basePrice" | "variablePercent" | "variableBasis">) {
  const pct = s.variablePercent !== null ? `${s.variablePercent}%${s.variableBasis ? ` ${s.variableBasis}` : ""}` : null;
  if (s.pricingModel === "FIXO") return `${brl(s.basePrice)}/mês`;
  if (s.pricingModel === "VARIAVEL") return pct ?? "variável";
  return `${brl(s.basePrice)}/mês + ${pct ?? "variável"}`;
}

/** Catálogo de serviços da FortGrow — fixo, variável (% sobre algo) ou híbrido (fixo + variável). */
export function ServicesPanel({ services }: { services: ServiceDTO[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [pricingModel, setPricingModel] = useState<"FIXO" | "VARIAVEL" | "HIBRIDO">("FIXO");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function openCreate() {
    setEditing(null);
    setPricingModel("FIXO");
    setOpen(true);
  }

  function openEdit(s: ServiceDTO) {
    setEditing(s);
    setPricingModel(s.pricingModel);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setPricingModel("FIXO");
    setError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      description: form.get("description") || undefined,
      pricingModel,
      basePrice: form.get("basePrice") || undefined,
      variablePercent: form.get("variablePercent") || undefined,
      variableBasis: form.get("variableBasis") || undefined,
    };
    try {
      const res = await fetch("/api/services", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
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
      const res = await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Não foi possível excluir.");
        return;
      }
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <Layers size={15} className="text-brand-400" /> Catálogo de serviços
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Serviços fixos, variáveis (% sobre algo, ex.: investimento em mídia) ou híbridos (fixo + variável).
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={15} /> Novo serviço
        </button>
      </div>

      {services.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">Nenhum serviço cadastrado ainda.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-200">{s.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(s)}
                    title="Editar serviço"
                    className="rounded-lg p-1 text-slate-600 transition hover:bg-brand-500/10 hover:text-brand-400"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={removing === s.id}
                    title="Excluir serviço"
                    className="rounded-lg p-1 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                  >
                    {removing === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">{s.clientCount} cliente(s) · {pricingLabel(s)}</p>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  s.pricingModel === "FIXO" && "bg-brand-500/15 text-brand-300",
                  s.pricingModel === "VARIAVEL" && "bg-warn/15 text-warn",
                  s.pricingModel === "HIBRIDO" && "bg-violet/15 text-violet"
                )}
              >
                {PRICING_MODELS.find((p) => p.key === s.pricingModel)?.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">{editing ? `Editar ${editing.name}` : "Novo serviço"}</h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="sv-name">Nome do serviço *</label>
                <input
                  id="sv-name"
                  name="name"
                  required
                  minLength={2}
                  defaultValue={editing?.name ?? ""}
                  className="input"
                  placeholder="Ex.: Gestão de Tráfego"
                />
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
                  <label className="label" htmlFor="sv-base">Valor fixo mensal (R$) *</label>
                  <input
                    id="sv-base"
                    name="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={editing?.basePrice || ""}
                    className="input"
                    placeholder="2500"
                  />
                </div>
              )}

              {(pricingModel === "VARIAVEL" || pricingModel === "HIBRIDO") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="sv-pct">Percentual variável (%) *</label>
                    <input
                      id="sv-pct"
                      name="variablePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      defaultValue={editing?.variablePercent ?? ""}
                      className="input"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="sv-basis">Sobre o quê?</label>
                    <input
                      id="sv-basis"
                      name="variableBasis"
                      defaultValue={editing?.variableBasis ?? ""}
                      className="input"
                      placeholder="sobre investimento em mídia"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label" htmlFor="sv-desc">Descrição</label>
                <input
                  id="sv-desc"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  className="input"
                  placeholder="Do que se trata este serviço"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} {editing ? "Salvar alterações" : "Criar serviço"}
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
