"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/** Ações da Lixeira: restaurar o cliente ou excluir definitivamente. */
export function TrashActions({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState<"restore" | "purge" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function restore() {
    setLoading("restore");
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, restore: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível restaurar.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function purge() {
    setLoading("purge");
    setError(null);
    try {
      const res = await fetch(`/api/clients?id=${encodeURIComponent(clientId)}&purge=1`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível excluir.");
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={restore}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-grow-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-grow-400 ring-1 ring-inset ring-grow-500/20 transition hover:bg-grow-500/20 disabled:opacity-40"
        >
          {loading === "restore" ? <Loader2 size={13} className="animate-spin" /> : <ArchiveRestore size={13} />}
          Restaurar
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading !== null}
          title="Excluir definitivamente"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}

      {confirmOpen && (
        <Overlay>
          <div className="card w-full max-w-md animate-fade-up p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-xl bg-danger/10 p-2.5 text-danger">
                <AlertTriangle size={18} />
              </span>
              <h2 className="text-lg font-bold text-slate-100">Excluir {companyName} definitivamente?</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Esta ação é <span className="font-semibold text-danger">permanente</span> e remove tudo da conta:
              serviços, contratos, projetos, tarefas, faturas, documentos, chamados, métricas e os acessos ao portal.
              Não dá para desfazer.
            </p>
            <div className="mt-4">
              <label className="label" htmlFor={`purge-${clientId}`}>
                Digite <span className="font-bold text-slate-300">{companyName}</span> para confirmar
              </label>
              <input
                id={`purge-${clientId}`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input"
                placeholder={companyName}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmOpen(false); setConfirmText(""); }} className="btn-ghost">Cancelar</button>
              <button
                onClick={purge}
                disabled={loading !== null || confirmText.trim() !== companyName}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/80 disabled:opacity-40"
              >
                {loading === "purge" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
