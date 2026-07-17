"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

const TYPES = [
  ["CONTRATO", "Contrato"],
  ["BRIEFING", "Briefing"],
  ["CRIATIVO", "Criativo"],
  ["RELATORIO", "Relatório"],
  ["APRESENTACAO", "Apresentação"],
  ["PLANEJAMENTO", "Planejamento (calendário)"],
  ["NOTA_FISCAL", "Nota fiscal"],
  ["VIDEO", "Vídeo"],
  ["IMAGEM", "Imagem"],
  ["OUTRO", "Outro"],
] as const;

/** Upload de documento na ficha do cliente — aparece no portal dele. */
export function UploadDocForm({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    form.set("clientId", clientId);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Falha no upload.");
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="doc-file">Arquivo (máx. 10 MB)</label>
        <input id="doc-file" name="file" type="file" required className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-300" />
      </div>
      <div>
        <label className="label" htmlFor="doc-type">Tipo</label>
        <select id="doc-type" name="type" className="input w-44" defaultValue="RELATORIO">
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Enviar
      </button>
      {error && <p className="w-full text-sm font-medium text-danger">{error}</p>}
    </form>
  );
}
