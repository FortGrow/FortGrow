"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type EditableClient = {
  id: string;
  companyName: string;
  cnpj: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  plan: string | null;
  billingType: string;
  monthlyValue: number;
  commissionBase: number;
  commissionShare: number;
  contractStart: string | null;
  contractMonths: number | null;
  projectStatus: string | null;
  notes: string | null;
};

const TEXT_FIELDS: { name: keyof EditableClient; label: string; type?: string }[] = [
  { name: "companyName", label: "Empresa *" },
  { name: "cnpj", label: "CNPJ" },
  { name: "segment", label: "Segmento" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone" },
  { name: "website", label: "Site" },
  { name: "instagram", label: "Instagram" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "UF" },
  { name: "plan", label: "Plano / descrição do contrato" },
  { name: "contractStart", label: "Início do contrato", type: "date" },
  { name: "contractMonths", label: "Tempo de contrato (meses)", type: "number" },
  { name: "projectStatus", label: "Status do projeto" },
];

/** Edição completa do cliente — formulário populado com os dados atuais. */
export function EditClientForm({ client }: { client: EditableClient }) {
  const [open, setOpen] = useState(false);
  const [billingType, setBillingType] = useState(client.billingType);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { id: client.id, billingType };
    for (const [k, v] of form.entries()) payload[k] = v;
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
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
      setTimeout(() => setOpen(false), 900);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Pencil size={15} /> Editar cliente
      </button>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-2xl animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Editar {client.companyName}</h2>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ec-status">Status da conta</label>
                <select id="ec-status" name="status" defaultValue={client.status} className="input">
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
              <div>
                <label className="label">Tipo de contrato</label>
                <div className="flex gap-2">
                  {(
                    [
                      ["FIXO", "Fixo mensal"],
                      ["COMISSAO", "Comissão"],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBillingType(v)}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        billingType === v
                          ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                          : "bg-ink-800 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {billingType === "FIXO" ? (
                <div>
                  <label className="label" htmlFor="ec-monthlyValue">Valor mensal (R$)</label>
                  <input
                    id="ec-monthlyValue"
                    name="monthlyValue"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={client.monthlyValue}
                    className="input"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="label" htmlFor="ec-monthlyValue-com">Mensalidade fixa (R$) — opcional</label>
                    <input
                      id="ec-monthlyValue-com"
                      name="monthlyValue"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={client.monthlyValue}
                      className="input"
                      placeholder="0,00 se o contrato for só comissão"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="ec-commissionBase">Base do cliente (%)</label>
                    <input id="ec-commissionBase" name="commissionBase" type="number" min="0" max="100" step="0.001" defaultValue={client.commissionBase} className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="ec-commissionShare">Percentual FortGrow (%)</label>
                    <input id="ec-commissionShare" name="commissionShare" type="number" min="0" max="100" step="0.001" defaultValue={client.commissionShare} className="input" />
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {TEXT_FIELDS.map((f) => (
                <div key={f.name}>
                  <label className="label" htmlFor={`ec-${f.name}`}>{f.label}</label>
                  <input
                    id={`ec-${f.name}`}
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.name === "companyName"}
                    maxLength={f.name === "state" ? 2 : undefined}
                    defaultValue={(client[f.name] as string | number | null) ?? ""}
                    className="input"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ec-notes">Observações</label>
                <textarea id="ec-notes" name="notes" rows={3} defaultValue={client.notes ?? ""} className="input" />
              </div>
            </div>

            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                  <CheckCircle2 size={15} /> Dados atualizados com sucesso!
                </span>
              )}
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar alterações
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}
