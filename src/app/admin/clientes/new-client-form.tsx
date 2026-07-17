"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

const FIELDS: { name: string; label: string; type?: string }[] = [
  { name: "companyName", label: "Empresa *" },
  { name: "cnpj", label: "CNPJ" },
  { name: "segment", label: "Segmento" },
  { name: "contractMonths", label: "Tempo de contrato (meses)", type: "number" },
  { name: "contractStart", label: "Início do contrato", type: "date" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone" },
  { name: "website", label: "Site" },
  { name: "instagram", label: "Instagram" },
  { name: "city", label: "Cidade" },
];

export type PlanOption = { name: string; price: number };

export function NewClientForm({ plans = [] }: { plans?: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  const [billingType, setBillingType] = useState<"FIXO" | "COMISSAO">("FIXO");
  const [planChoice, setPlanChoice] = useState("");
  const [monthly, setMonthly] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function selectPlan(name: string) {
    setPlanChoice(name);
    const plan = plans.find((p) => p.name === name);
    if (plan && plan.price > 0) setMonthly(String(plan.price));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(Array.from(form.entries()).filter(([, v]) => String(v).trim() !== ""));
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <Plus size={15} /> Novo cliente
      </button>
    );
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-2xl animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Novo cliente</h2>

        {/* Modelo de cobrança */}
        <div className="mb-4 rounded-xl border border-line bg-ink-900/50 p-4">
          <label className="label">Tipo de contrato *</label>
          <div className="flex gap-2">
            {(
              [
                ["FIXO", "Valor fixo mensal"],
                ["COMISSAO", "Comissão sobre resultado"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setBillingType(v)}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  billingType === v
                    ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                    : "bg-ink-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <input type="hidden" name="billingType" value={billingType} />

          <div className="mt-4">
            <label className="label" htmlFor="nc-plan">Plano FortGrow</label>
            <select id="nc-plan" value={planChoice} onChange={(e) => selectPlan(e.target.value)} className="input">
              <option value="">Selecione um plano…</option>
              {plans.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
              <option value="__custom">Personalizado (digitar)</option>
            </select>
            {planChoice === "__custom" ? (
              <input name="plan" className="input mt-2" placeholder="Descreva o plano/contrato" />
            ) : (
              <input type="hidden" name="plan" value={planChoice} />
            )}
            <p className="mt-1 text-xs text-slate-600">
              Cadastre e edite seus pacotes em <span className="font-semibold text-slate-400">Serviços &amp; Planos</span>.
            </p>
          </div>

          {billingType === "FIXO" ? (
            <div className="mt-4">
              <label className="label" htmlFor="nc-monthlyValue">Valor mensal (R$) *</label>
              <input
                id="nc-monthlyValue"
                name="monthlyValue"
                type="number"
                min="0"
                step="0.01"
                required
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className="input"
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="nc-commissionBase">Base de comissão do cliente (%) *</label>
                <input
                  id="nc-commissionBase"
                  name="commissionBase"
                  type="number"
                  min="0.001"
                  max="100"
                  step="0.001"
                  required
                  className="input"
                  placeholder="ex.: 3"
                />
                <p className="mt-1 text-xs text-slate-600">% que o cliente fatura sobre o volume vendido.</p>
              </div>
              <div>
                <label className="label" htmlFor="nc-commissionShare">Percentual da FortGrow (%) *</label>
                <input
                  id="nc-commissionShare"
                  name="commissionShare"
                  type="number"
                  min="0.001"
                  max="100"
                  step="0.001"
                  required
                  className="input"
                  placeholder="ex.: 10"
                />
                <p className="mt-1 text-xs text-slate-600">% da FortGrow sobre a comissão do cliente.</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 sm:col-span-2">
                Exemplo: R$ 1.000.000 vendidos × 3% = R$ 30.000 de comissão do cliente → FortGrow recebe 10% = R$ 3.000.
                Se a base variar no mês (ex.: parcela fechada em 50% → 1,5%), ajuste na hora de lançar o faturamento em
                <span className="font-semibold text-slate-400"> Faturamento → Lançar comissão</span>.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label" htmlFor={`nc-${f.name}`}>{f.label}</label>
              <input
                id={`nc-${f.name}`}
                name={f.name}
                type={f.type ?? "text"}
                required={f.name === "companyName"}
                min={f.type === "number" ? 0 : undefined}
                className="input"
              />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="nc-state">UF</label>
            <input id="nc-state" name="state" maxLength={2} className="input" placeholder="PR" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Cadastrar cliente
          </button>
        </div>
      </form>
    </Overlay>
  );
}
