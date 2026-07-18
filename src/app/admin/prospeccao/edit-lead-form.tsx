"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type EditableLead = {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  website: string | null;
  source: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  potential: string | null;
  estimatedValue: number;
  notes: string | null;
};

const FIELDS: { name: keyof EditableLead; label: string; type?: string }[] = [
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
  { name: "state", label: "UF" },
  { name: "estimatedValue", label: "Valor estimado (R$)", type: "number" },
];

/** Edição completa do lead — formulário populado com os dados atuais. */
export function EditLeadForm({ lead, light = false }: { lead: EditableLead; light?: boolean }) {
  const [open, setOpen] = useState(false);
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
    const payload: Record<string, unknown> = { id: lead.id };
    for (const [k, v] of form.entries()) payload[k] = v;
    try {
      const res = await fetch("/api/leads", {
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
      <button
        onClick={() => setOpen(true)}
        title="Editar lead"
        className={
          light
            ? "shrink-0 rounded-lg bg-black/20 p-1.5 text-white/80 transition hover:bg-black/35 hover:text-white"
            : "rounded-lg p-2 text-slate-500 transition hover:bg-brand-500/10 hover:text-brand-400"
        }
      >
        <Pencil size={14} />
      </button>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-2xl animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Editar {lead.companyName}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.name}>
                  <label className="label" htmlFor={`el-${f.name}`}>{f.label}</label>
                  <input
                    id={`el-${f.name}`}
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.name === "companyName"}
                    maxLength={f.name === "state" ? 2 : undefined}
                    defaultValue={(lead[f.name] as string | number | null) ?? ""}
                    className="input"
                  />
                </div>
              ))}
              <div>
                <label className="label" htmlFor="el-potential">Potencial</label>
                <select id="el-potential" name="potential" defaultValue={lead.potential ?? "Médio"} className="input">
                  <option>Baixo</option>
                  <option>Médio</option>
                  <option>Alto</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="el-notes">Observações</label>
                <textarea id="el-notes" name="notes" rows={2} defaultValue={lead.notes ?? ""} className="input" />
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
