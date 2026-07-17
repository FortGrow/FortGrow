"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

export type PortalUser = { id: string; name: string; email: string; active: boolean };

/**
 * Gestão dos acessos do cliente ao Portal — criados daqui já saem
 * padronizados: o usuário enxerga somente os dados da própria empresa
 * (dashboards, financeiro, documentos e chamados).
 */
export function PortalAccessPanel({ clientId, users }: { clientId: string; users: PortalUser[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const router = useRouter();

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email, password, role: "CLIENTE", clientId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível criar o acesso.");
        return;
      }
      setCreated({ email: email.toLowerCase(), password });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onRemove(id: string) {
    setRemoving(id);
    try {
      await fetch(`/api/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
            <KeyRound size={15} className="text-brand-400" /> Acessos ao Portal do Cliente
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            O cliente entra pelo mesmo login do sistema e enxerga apenas os dados da própria empresa.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <UserPlus size={15} /> Criar acesso
        </button>
      </div>

      {created && (
        <div className="mb-4 rounded-xl bg-grow-500/10 px-4 py-3 text-sm ring-1 ring-inset ring-grow-500/20">
          <p className="font-semibold text-grow-400">Acesso criado! Envie ao cliente:</p>
          <p className="mt-1 text-slate-300">
            Login: <span className="font-mono">{created.email}</span> · Senha:{" "}
            <span className="font-mono">{created.password}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Recomende que ele troque a senha no primeiro acesso (Meu perfil).</p>
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum acesso criado ainda.</p>
      ) : (
        <div className="divide-y divide-line/60">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-200">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <button
                onClick={() => onRemove(u.id)}
                disabled={removing === u.id}
                title="Remover acesso"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-danger/10 hover:text-danger"
              >
                {removing === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={onCreate} className="card w-full max-w-md animate-fade-up p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Criar acesso ao portal</h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="pa-name">Nome do usuário *</label>
                <input id="pa-name" name="name" required minLength={2} className="input" placeholder="Nome de quem vai acessar" />
              </div>
              <div>
                <label className="label" htmlFor="pa-email">E-mail de login *</label>
                <input id="pa-email" name="email" type="email" required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="pa-password">Senha inicial *</label>
                <input id="pa-password" name="password" type="text" required minLength={8} className="input" placeholder="mínimo 8 caracteres" />
                <p className="mt-1 text-xs text-slate-600">Anote e envie ao cliente — ele poderá trocar depois.</p>
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Criar acesso
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
