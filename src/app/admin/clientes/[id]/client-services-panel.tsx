"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { StatusBadge } from "@/components/ui/badge";
import { fullDate } from "@/lib/utils";

export type ClientServiceDTO = {
  id: string;
  serviceId: string;
  serviceName: string;
  responsible: string | null;
  deadline: string | null;
  status: string;
};

/** Bloco "Serviços contratados" da ficha do cliente — liga serviços do catálogo ao cliente. */
export function ClientServicesPanel({
  clientId,
  items,
  services,
}: {
  clientId: string;
  items: ClientServiceDTO[];
  services: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const available = services.filter((s) => !items.some((i) => i.serviceId === s.id));

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/client-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceId: form.get("serviceId"),
          responsible: form.get("responsible") || undefined,
          startDate: form.get("startDate") || undefined,
          deadline: form.get("deadline") || undefined,
        }),
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

  async function remove(id: string) {
    setRemoving(id);
    try {
      await fetch(`/api/client-services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
          <Briefcase size={15} className="text-brand-400" /> Serviços contratados
        </h2>
        <button onClick={() => setOpen(true)} className="btn-ghost !px-3 !py-1.5 text-xs">
          <Plus size={13} /> Ligar serviço
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-600">
          Nenhum serviço do catálogo ligado a este cliente ainda.
        </div>
      ) : (
        <div className="card divide-y divide-line/60 p-2">
          {items.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{s.serviceName}</p>
                <p className="text-xs text-slate-500">
                  {s.responsible ?? "sem responsável"} · prazo {fullDate(s.deadline)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={s.status} />
                <button
                  onClick={() => remove(s.id)}
                  disabled={removing === s.id}
                  title="Remover vínculo"
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
                >
                  {removing === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={onCreate} className="card w-full max-w-md animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Ligar serviço ao cliente</h2>
            {available.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todos os serviços ativos do catálogo já estão ligados a este cliente. Cadastre mais serviços em{" "}
                <span className="font-semibold text-slate-400">Serviços &amp; Planos</span>.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="cs-service">Serviço *</label>
                  <select id="cs-service" name="serviceId" required className="input">
                    <option value="">Selecione…</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="cs-resp">Responsável</label>
                  <input id="cs-resp" name="responsible" className="input" placeholder="Quem toca esse serviço" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="cs-start">Início</label>
                    <input id="cs-start" name="startDate" type="date" className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="cs-deadline">Prazo</label>
                    <input id="cs-deadline" name="deadline" type="date" className="input" />
                  </div>
                </div>
              </div>
            )}
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              {available.length > 0 && (
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading && <Loader2 size={15} className="animate-spin" />} Ligar serviço
                </button>
              )}
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
