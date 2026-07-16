"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const FIELDS: { name: string; label: string; type?: string }[] = [
  { name: "companyName", label: "Empresa *" },
  { name: "cnpj", label: "CNPJ" },
  { name: "segment", label: "Segmento" },
  { name: "plan", label: "Plano contratado" },
  { name: "monthlyValue", label: "Valor mensal (R$)", type: "number" },
  { name: "contractMonths", label: "Tempo de contrato (meses)", type: "number" },
  { name: "contractStart", label: "Início do contrato", type: "date" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone" },
  { name: "website", label: "Site" },
  { name: "instagram", label: "Instagram" },
  { name: "city", label: "Cidade" },
];

export function NewClientForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm sm:items-center">
      <form onSubmit={onSubmit} className="card w-full max-w-2xl animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Novo cliente</h2>
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
    </div>
  );
}
