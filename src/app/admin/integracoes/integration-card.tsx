"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plug, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";
import { Overlay } from "@/components/ui/overlay";

export function IntegrationCard({ provider, name, connected }: { provider: string; name: string; connected: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function connect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOkMsg(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: form.get("apiKey"), accountId: form.get("accountId") || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível conectar.");
        return;
      }
      setOkMsg(data.validatedAs ? `Token validado (${data.validatedAs}) — conectado!` : "Conectado!");
      router.refresh();
      setTimeout(() => { setOpen(false); setOkMsg(null); }, 1200);
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      await fetch(`/api/integrations?provider=${encodeURIComponent(provider)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card flex items-center justify-between gap-2 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">{name}</p>
          <p className={cn("text-[11px] font-medium", connected ? "text-grow-400" : "text-slate-600")}>
            {connected ? "Conectado" : "Não conectado"}
          </p>
        </div>
        <button
          onClick={() => (connected ? disconnect() : setOpen(true))}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            connected
              ? "bg-danger/10 text-danger ring-1 ring-inset ring-danger/20 hover:bg-danger/20"
              : "bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20 hover:bg-brand-500/20"
          )}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : connected ? <Unplug size={13} /> : <Plug size={13} />}
          {connected ? "Desconectar" : "Conectar"}
        </button>
      </div>

      {open && (
        <Overlay>
          <form onSubmit={connect} className="card w-full max-w-md animate-fade-up p-6">
            <h2 className="mb-1 text-lg font-bold text-slate-100">Conectar {name}</h2>
            {provider === "meta_ads" ? (
              <div className="mb-4 rounded-xl border border-line bg-ink-900/50 p-3 text-xs leading-relaxed text-slate-400">
                <p className="mb-1 font-semibold text-slate-300">Como gerar o Access Token (uma vez só):</p>
                <ol className="list-decimal space-y-0.5 pl-4">
                  <li>Acesse <span className="font-semibold text-brand-400">business.facebook.com</span> → Configurações do negócio</li>
                  <li>Usuários → <span className="font-semibold text-slate-300">Usuários do sistema</span> → Adicionar (papel Administrador)</li>
                  <li>Atribua as contas de anúncio dos clientes a esse usuário</li>
                  <li>Gerar token → marque <span className="font-semibold text-slate-300">ads_read</span> → copie e cole aqui</li>
                </ol>
                <p className="mt-1.5 text-slate-500">O token é validado na hora e fica criptografado. Depois, o ID de cada conta (act_...) vai na ficha do cliente.</p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-slate-500">
                Informe a credencial de API da plataforma. Ela fica armazenada com segurança e será usada para sincronizar
                métricas e campanhas.
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor={`key-${provider}`}>Token / API Key *</label>
                <input id={`key-${provider}`} name="apiKey" required minLength={4} className="input" placeholder="cole aqui o token" />
              </div>
              <div>
                <label className="label" htmlFor={`acc-${provider}`}>ID da conta (opcional)</label>
                <input id={`acc-${provider}`} name="accountId" className="input" placeholder="ex.: 123-456-7890" />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            {okMsg && <p className="mt-3 text-sm font-medium text-grow-400">{okMsg}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Conectar
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}
