"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type CalendarPost = {
  id: string;
  date: string;
  title: string;
  format: string | null;
  script: string | null;
  expectedMetrics: string | null;
  status: string;
};

const FORMATS = ["Reels", "Carrossel", "Story", "Feed", "Live", "Vídeo", "Outro"];
const STATUS_TONE: Record<string, string> = {
  PLANEJADO: "bg-brand-500/10 text-brand-400",
  APROVADO: "bg-warn/10 text-warn",
  PUBLICADO: "bg-grow-500/10 text-grow-400",
};

/** Gestão do calendário de postagens do cliente (visível no portal dele). */
export function ContentCalendarPanel({ clientId, posts }: { clientId: string; posts: CalendarPost[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { clientId };
    for (const [k, v] of form.entries()) if (String(v).trim() !== "") payload[k] = v;
    try {
      const res = await fetch("/api/posts", {
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

  async function setStatus(id: string, status: string) {
    await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      await fetch(`/api/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <CalendarDays size={15} className="text-brand-400" /> Calendário de postagens
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            O cliente vê tudo na aba Calendário do portal. Para anexar o planejamento em PDF, use
            &quot;Enviar documento&quot; abaixo com o tipo <span className="font-semibold text-slate-400">Planejamento</span>.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={15} /> Nova postagem
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhuma postagem planejada ainda.</p>
      ) : (
        <div className="divide-y divide-line/60">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="w-20 shrink-0 text-center">
                <p className="text-lg font-bold text-slate-200">{new Date(p.date).getDate()}</p>
                <p className="text-[11px] uppercase text-slate-500">
                  {new Date(p.date).toLocaleDateString("pt-BR", { month: "short" })}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200">
                  {p.title}
                  {p.format && <span className="ml-2 text-xs font-medium text-violet">{p.format}</span>}
                </p>
                {p.script && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.script}</p>}
                {p.expectedMetrics && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Métricas esperadas:</span> {p.expectedMetrics}
                  </p>
                )}
              </div>
              <select
                value={p.status}
                onChange={(e) => setStatus(p.id, e.target.value)}
                className={`rounded-lg border-0 px-2 py-1 text-[11px] font-semibold ${STATUS_TONE[p.status] ?? ""}`}
              >
                <option value="PLANEJADO">PLANEJADO</option>
                <option value="APROVADO">APROVADO</option>
                <option value="PUBLICADO">PUBLICADO</option>
              </select>
              <button
                onClick={() => remove(p.id)}
                disabled={removing === p.id}
                title="Remover postagem"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
              >
                {removing === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={onCreate} className="card w-full max-w-lg animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Nova postagem no calendário</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="cp-date">Data *</label>
                  <input id="cp-date" name="date" type="date" required className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="cp-format">Formato</label>
                  <select id="cp-format" name="format" className="input">
                    {FORMATS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="cp-title">Postagem *</label>
                <input id="cp-title" name="title" required minLength={2} className="input" placeholder="Ex.: Reels — bastidores da obra" />
              </div>
              <div>
                <label className="label" htmlFor="cp-script">Roteiro</label>
                <textarea id="cp-script" name="script" rows={4} className="input" placeholder="Roteiro da postagem: gancho, desenvolvimento, CTA…" />
              </div>
              <div>
                <label className="label" htmlFor="cp-metrics">Métricas esperadas</label>
                <input id="cp-metrics" name="expectedMetrics" className="input" placeholder="Ex.: 10 mil de alcance · 500 curtidas · 20 leads" />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Adicionar ao calendário
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
