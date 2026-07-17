"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

const ROLES = [
  ["ADMIN", "Administrador"],
  ["FINANCEIRO", "Financeiro"],
  ["COMERCIAL", "Comercial"],
  ["GESTOR", "Gestor"],
  ["SOCIAL_MEDIA", "Social Media"],
  ["DESIGNER", "Designer"],
  ["TRAFEGO_PAGO", "Tráfego Pago"],
  ["CONSULTOR", "Consultor"],
  ["CLIENTE", "Cliente (acesso ao Portal)"],
] as const;

export function NewUserForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("CONSULTOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível cadastrar.");
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
        <UserPlus size={15} /> Novo usuário
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 py-10 backdrop-blur-sm sm:items-center">
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Novo usuário</h2>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="nu-name">Nome completo *</label>
            <input id="nu-name" name="name" required minLength={2} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="nu-email">E-mail de acesso *</label>
              <input id="nu-email" name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="nu-password">Senha inicial *</label>
              <input id="nu-password" name="password" type="password" required minLength={8} className="input" placeholder="mín. 8 caracteres" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nu-role">Papel *</label>
            <select id="nu-role" name="role" required className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {role === "CLIENTE" && (
            <div>
              <label className="label" htmlFor="nu-client">Empresa do cliente *</label>
              <select id="nu-client" name="clientId" required className="input">
                <option value="">Selecione…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Cadastrar usuário
          </button>
        </div>
      </form>
    </div>
  );
}
