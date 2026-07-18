"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/**
 * Exclusão de cliente com confirmação — envia para a Lixeira (30 dias),
 * de onde dá para restaurar ou excluir definitivamente.
 */
export function DeleteClientButton({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients?id=${encodeURIComponent(clientId)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível excluir.");
        return;
      }
      setOpen(false);
      router.push("/admin/clientes");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Excluir cliente"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 size={15} />
      </button>

      {open && (
        <Overlay>
          <div className="card w-full max-w-md animate-fade-up p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-xl bg-danger/10 p-2.5 text-danger">
                <Archive size={18} />
              </span>
              <h2 className="text-lg font-bold text-slate-100">Excluir {companyName}?</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              O cliente vai para a <span className="font-semibold text-slate-200">Lixeira por 30 dias</span> e os
              acessos ao portal são suspensos na hora. Nesse período você pode restaurar tudo em Clientes → Lixeira.
              Depois dos 30 dias, a conta é excluída definitivamente (serviços, contratos, projetos, faturas,
              documentos e métricas).
            </p>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button
                onClick={onDelete}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/80 disabled:opacity-40"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Mover para a Lixeira
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
