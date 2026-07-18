"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

const ROLES: [string, string][] = [
  ["ADMIN", "Admin"],
  ["FINANCEIRO", "Financeiro"],
  ["COMERCIAL", "Comercial"],
  ["GESTOR", "Gestor"],
  ["SOCIAL_MEDIA", "Social Media"],
  ["DESIGNER", "Designer"],
  ["TRAFEGO_PAGO", "Tráfego Pago"],
  ["CONSULTOR", "Consultor"],
  ["CLIENTE", "Cliente (portal)"],
];

/**
 * Edição de um login existente: nome, papel, empresa vinculada (para acessos
 * de cliente), ativo/inativo e nova senha. Corrige acessos criados errado —
 * as sessões antigas do usuário caem na hora.
 */
export function UserEditor({
  user,
  clients,
}: {
  user: { id: string; name: string; role: string; clientId: string | null; active: boolean };
  clients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      id: user.id,
      name: form.get("name"),
      role,
      active: form.get("active") === "1",
    };
    if (role === "CLIENTE") payload.clientId = form.get("clientId");
    const password = String(form.get("password") ?? "").trim();
    if (password) payload.password = password;
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => { setOpen(false); setSaved(false); }, 900);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar usuário (papel, empresa, senha)"
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-brand-300"
      >
        <Pencil size={13} />
      </button>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-md animate-fade-up p-6">
            <h2 className="mb-1 text-lg font-bold text-slate-100">Editar acesso</h2>
            <p className="mb-4 text-xs text-slate-500">
              Mudanças de papel/empresa derrubam as sessões antigas na hora — o usuário entra de novo já na área certa.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor={`ue-name-${user.id}`}>Nome</label>
                <input id={`ue-name-${user.id}`} name="name" required minLength={2} defaultValue={user.name} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor={`ue-role-${user.id}`}>Papel</label>
                  <select id={`ue-role-${user.id}`} value={role} onChange={(e) => setRole(e.target.value)} className="input">
                    {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={`ue-active-${user.id}`}>Status</label>
                  <select id={`ue-active-${user.id}`} name="active" defaultValue={user.active ? "1" : "0"} className="input">
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </div>
              </div>
              {role === "CLIENTE" && (
                <div>
                  <label className="label" htmlFor={`ue-client-${user.id}`}>Empresa (portal) *</label>
                  <select id={`ue-client-${user.id}`} name="clientId" required defaultValue={user.clientId ?? ""} className="input">
                    <option value="">Selecione a empresa…</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-600">
                    Usuários cliente veem só os dados desta empresa no portal.
                  </p>
                </div>
              )}
              <div>
                <label className="label" htmlFor={`ue-pass-${user.id}`}>Nova senha (opcional)</label>
                <input
                  id={`ue-pass-${user.id}`}
                  name="password"
                  type="password"
                  minLength={8}
                  placeholder="Deixe vazio para manter a atual"
                  className="input"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-5 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                  <CheckCircle2 size={15} /> Acesso atualizado!
                </span>
              )}
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}
