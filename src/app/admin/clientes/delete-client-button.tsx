"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

/** Exclusão de cliente com confirmação digitada — remove tudo da conta. */
export function DeleteClientButton({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId }),
      });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-fade-up p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-xl bg-danger/10 p-2.5 text-danger">
                <AlertTriangle size={18} />
              </span>
              <h2 className="text-lg font-bold text-slate-100">Excluir {companyName}?</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Esta ação é <span className="font-semibold text-danger">permanente</span> e remove tudo da conta:
              serviços, contratos, projetos, tarefas, faturas, documentos, chamados, métricas e os acessos ao portal.
            </p>
            <div className="mt-4">
              <label className="label" htmlFor="dc-confirm">
                Digite <span className="font-bold text-slate-300">{companyName}</span> para confirmar
              </label>
              <input
                id="dc-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input"
                placeholder={companyName}
              />
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setOpen(false); setConfirmText(""); }} className="btn-ghost">Cancelar</button>
              <button
                onClick={onDelete}
                disabled={loading || confirmText.trim() !== companyName}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/80 disabled:opacity-40"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
