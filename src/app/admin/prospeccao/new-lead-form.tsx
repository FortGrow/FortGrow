"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const FIELDS: { name: string; label: string; type?: string; span?: boolean }[] = [
  { name: "companyName", label: "Empresa *" },
  { name: "contactName", label: "Contato" },
  { name: "phone", label: "Telefone" },
  { name: "whatsapp", label: "WhatsApp" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "instagram", label: "Instagram" },
  { name: "facebook", label: "Facebook" },
  { name: "linkedin", label: "LinkedIn" },
  { name: "website", label: "Site" },
  { name: "source", label: "Origem" },
  { name: "segment", label: "Segmento" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "Estado" },
  { name: "estimatedValue", label: "Valor estimado (R$)", type: "number" },
];

export function NewLeadForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(
      Array.from(form.entries()).filter(([, v]) => String(v).trim() !== "")
    );
    try {
      const res = await fetch("/api/leads", {
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
        <Plus size={15} /> Cadastrar empresa
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm sm:items-center">
      <form onSubmit={onSubmit} className="card w-full max-w-2xl animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Nova empresa em prospecção</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label" htmlFor={f.name}>{f.label}</label>
              <input
                id={f.name}
                name={f.name}
                type={f.type ?? "text"}
                required={f.name === "companyName"}
                className="input"
              />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="potential">Potencial</label>
            <select id="potential" name="potential" className="input" defaultValue="Médio">
              <option>Baixo</option>
              <option>Médio</option>
              <option>Alto</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Observações</label>
            <textarea id="notes" name="notes" rows={2} className="input" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Salvar lead
          </button>
        </div>
      </form>
    </div>
  );
}
