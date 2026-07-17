"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Plus } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

const CHANNELS = [
  ["GOOGLE_ADS", "Google Ads"],
  ["META_ADS", "Meta Ads"],
  ["INSTAGRAM", "Instagram"],
  ["SEO", "SEO"],
  ["LINKEDIN", "LinkedIn"],
  ["TIKTOK", "TikTok Ads"],
  ["EMAIL", "E-mail"],
  ["OUTRO", "Outro"],
] as const;

export function NewCampaignForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível criar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={15} /> Nova campanha
      </button>
    );
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Nova campanha</h2>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="clientId">Cliente *</label>
            <select id="clientId" name="clientId" required className="input">
              <option value="">Selecione…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="name">Nome da campanha *</label>
            <input id="name" name="name" required minLength={2} className="input" placeholder="[Search] Institucional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="channel">Canal *</label>
              <select id="channel" name="channel" required className="input">
                {CHANNELS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="budget">Orçamento mensal (R$)</label>
              <input id="budget" name="budget" type="number" min="0" step="100" className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="objective">Objetivo</label>
            <input id="objective" name="objective" className="input" placeholder="Conversões, Leads, Alcance…" />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Criar campanha
          </button>
        </div>
      </form>
    </Overlay>
  );
}

export function CampaignToggle({ id, active }: { id: string; active: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? "Pausar campanha" : "Ativar campanha"}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition ${
        active
          ? "bg-warn/10 text-warn ring-warn/20 hover:bg-warn/20"
          : "bg-grow-500/10 text-grow-400 ring-grow-500/20 hover:bg-grow-500/20"
      }`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : active ? <Pause size={12} /> : <Play size={12} />}
      {active ? "Pausar" : "Ativar"}
    </button>
  );
}
