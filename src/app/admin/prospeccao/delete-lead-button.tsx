"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/**
 * Gatilho de exclusão do lead — mesmo padrão do botão de editar (variante
 * `light` para os cards coloridos da prospecção/CRM). Pede confirmação antes
 * de excluir e avisa o pai via onDeleted para remover o card da tela.
 */
export function DeleteLeadButton({
  id,
  name,
  light = false,
  onDeleted,
}: {
  id: string;
  name: string;
  light?: boolean;
  onDeleted?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível excluir.");
        return;
      }
      setOpen(false);
      onDeleted?.(id);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Excluir lead"
        className={
          light
            ? "shrink-0 rounded-lg bg-black/20 p-1.5 text-white/80 transition hover:bg-danger/70 hover:text-white"
            : "rounded-lg p-2 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
        }
      >
        <Trash2 size={14} />
      </button>

      {open && (
        <Overlay>
          <div className="card w-full max-w-md animate-fade-up p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Excluir lead</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Tem certeza que deseja excluir <span className="font-semibold text-slate-200">{name}</span>?
                  Essa ação também remove o histórico e as propostas do lead e não pode ser desfeita.
                </p>
              </div>
            </div>

            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/85 active:scale-[0.97] disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Excluir lead
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
