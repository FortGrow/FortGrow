"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/** Excluir contrato (com confirmação) direto na linha da tabela. */
export function ContractRowActions({ contractId, title }: { contractId: string; title: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function excluir() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts?id=${contractId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirm(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        title="Excluir contrato"
        className="rounded-lg p-2 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 size={15} />
      </button>

      {confirm && (
        <Overlay>
          <div className="card w-full max-w-md p-6">
            <h2 className="mb-2 text-base font-bold text-slate-100">Excluir contrato?</h2>
            <p className="mb-4 text-sm text-slate-400">
              “{title}” será removido por completo — sai da área de assinatura E dos Documentos do portal do
              cliente, e os arquivos deixam de existir. O cliente não verá mais nada deste contrato.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="btn-ghost">Cancelar</button>
              <button
                onClick={excluir}
                disabled={loading}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/80"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} className="mr-1 inline" />}
                Excluir
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
