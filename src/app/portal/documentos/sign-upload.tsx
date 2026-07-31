"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

/**
 * Envio do contrato assinado no gov.br: o cliente baixa o PDF, assina em
 * assinador.iti.br com a conta gov.br e devolve o arquivo assinado aqui.
 */
export function SignUpload({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    form.set("contractId", contractId);
    try {
      const res = await fetch("/api/contracts/sign", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Não foi possível enviar o arquivo.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input
        name="file"
        type="file"
        accept="application/pdf,.pdf"
        required
        className="input max-w-64 flex-1 !py-1.5 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-300"
      />
      <button type="submit" disabled={loading} className="btn-primary !px-3.5 !py-2 text-xs">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Enviar assinado
      </button>
      {error && <p className="w-full text-xs font-medium text-danger">{error}</p>}
    </form>
  );
}
