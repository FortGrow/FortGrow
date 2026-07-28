"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Target, Trash2, UserPlus, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/badge";
import { brl, cn, num } from "@/lib/utils";
import { crmDelete, crmPatch, crmPost, type CrmScope } from "./api";
import type { MemberDto } from "./types";

/**
 * Equipe da empresa: quem vende, em que departamento e com qual meta.
 *
 * "Usuário do portal" e "membro da equipe" são coisas diferentes de
 * propósito. Um vendedor pode existir aqui sem nunca acessar o sistema —
 * ele precisa aparecer como responsável e contar na meta. Quando ganha
 * acesso, o login do Portal é vinculado ao membro pelo seletor.
 */
export function CrmTeam({
  members,
  logins,
  desempenho,
  scope,
  readOnly = false,
}: {
  members: MemberDto[];
  /** Logins de Portal desta empresa, disponíveis para vincular */
  logins: { id: string; name: string; email: string }[];
  /** Ganhos e receita por membro, calculados no servidor */
  desempenho: Record<string, { ganhos: number; receita: number; abertos: number }>;
  scope: CrmScope;
  readOnly?: boolean;
}) {
  const [editando, setEditando] = useState<MemberDto | null>(null);
  const [criando, setCriando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const porDepartamento = members.reduce<Record<string, MemberDto[]>>((acc, m) => {
    const dep = m.department?.trim() || "Sem departamento";
    (acc[dep] ??= []).push(m);
    return acc;
  }, {});

  async function remover(m: MemberDto) {
    if (!confirm(`Remover ${m.name} da equipe? Os leads dele ficam sem responsável.`)) return;
    setRemovendo(m.id);
    try {
      await crmDelete("/api/crm/members", { id: m.id }, scope);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover.");
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {num(members.length)} pessoa(s) · meta somada{" "}
          <strong className="text-slate-300">
            {brl(members.reduce((s, m) => s + m.goal, 0))}
          </strong>
          /mês
        </p>
        {!readOnly && (
          <button onClick={() => setCriando(true)} className="btn-primary">
            <UserPlus size={15} /> Adicionar pessoa
          </button>
        )}
      </div>

      {erro && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
          {erro}
        </p>
      )}

      {members.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-semibold text-slate-300">Nenhuma pessoa cadastrada ainda.</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            Cadastre quem atende os leads para poder distribuir responsáveis, acompanhar metas e ver
            quem mais fecha negócio no painel.
          </p>
        </div>
      ) : (
        Object.entries(porDepartamento).map(([dep, lista]) => (
          <div key={dep}>
            <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">{dep}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((m) => {
                const d = desempenho[m.id] ?? { ganhos: 0, receita: 0, abertos: 0 };
                const atingido = m.goal > 0 ? Math.min(100, (d.receita / m.goal) * 100) : 0;
                return (
                  <div key={m.id} className={cn("card p-4", !m.active && "opacity-60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-200">{m.name}</p>
                        <p className="truncate text-xs text-slate-500">{m.email ?? m.phone ?? "—"}</p>
                      </div>
                      {!readOnly && (
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            onClick={() => setEditando(m)}
                            title="Editar"
                            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-ink-700 hover:text-brand-300"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => remover(m)}
                            disabled={removendo === m.id}
                            title="Remover"
                            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                          >
                            {removendo === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {!m.active && <Badge tone="danger">INATIVO</Badge>}
                      {m.userId && <Badge tone="brand">acessa o portal</Badge>}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <Mini label="Em aberto" valor={num(d.abertos)} />
                      <Mini label="Ganhos" valor={num(d.ganhos)} />
                      <Mini label="Receita" valor={brl(d.receita)} />
                    </div>

                    {m.goal > 0 && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-baseline justify-between text-[11px]">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Target size={10} /> Meta {brl(m.goal)}
                          </span>
                          <span className={cn("font-bold", atingido >= 100 ? "text-grow-400" : "text-slate-400")}>
                            {atingido.toFixed(0)}%
                          </span>
                        </div>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-ink-700">
                          <span
                            className="block h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${atingido}%`,
                              backgroundColor: atingido >= 100 ? "#10b981" : "#0284c7",
                            }}
                          />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {(criando || editando) && (
        <FormMembro
          member={editando ?? undefined}
          logins={logins}
          scope={scope}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-ink-850 py-1.5 ring-1 ring-inset ring-line">
      <p className="text-sm font-bold text-slate-200">{valor}</p>
      <p className="text-[9px] uppercase tracking-wide text-slate-600">{label}</p>
    </div>
  );
}

function FormMembro({
  member,
  logins,
  scope,
  onClose,
}: {
  member?: MemberDto;
  logins: { id: string; name: string; email: string }[];
  scope: CrmScope;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const f = new FormData(e.currentTarget);
    const corpo = {
      name: String(f.get("name")).trim(),
      email: String(f.get("email") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      department: String(f.get("department") ?? "").trim(),
      goal: Number(String(f.get("goal") ?? "0").replace(/\./g, "").replace(",", ".") || 0),
      active: f.get("active") === "on",
      userId: String(f.get("userId") ?? "") || null,
    };
    try {
      if (member) await crmPatch("/api/crm/members", { id: member.id, ...corpo }, scope);
      else await crmPost("/api/crm/members", corpo, scope);
      onClose();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-md animate-fade-up p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-100">
            {member ? `Editar ${member.name}` : "Adicionar à equipe"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="mb-name">Nome *</label>
            <input id="mb-name" name="name" required minLength={2} defaultValue={member?.name} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mb-email">E-mail</label>
              <input id="mb-email" name="email" type="email" defaultValue={member?.email ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="mb-phone">Telefone</label>
              <input id="mb-phone" name="phone" defaultValue={member?.phone ?? ""} className="input" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mb-dep">Departamento</label>
              <input id="mb-dep" name="department" defaultValue={member?.department ?? ""} className="input" placeholder="Comercial" />
            </div>
            <div>
              <label className="label" htmlFor="mb-goal">Meta mensal (R$)</label>
              <input
                id="mb-goal"
                name="goal"
                inputMode="decimal"
                defaultValue={member ? String(member.goal).replace(".", ",") : ""}
                className="input"
                placeholder="0,00"
              />
            </div>
          </div>

          {logins.length > 0 && (
            <div>
              <label className="label" htmlFor="mb-user">Login do portal</label>
              <select id="mb-user" name="userId" defaultValue={member?.userId ?? ""} className="input">
                <option value="">Sem acesso ao sistema</option>
                {logins.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {u.email}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-600">
                Vincular é opcional — serve para ligar o vendedor ao usuário que entra no Portal.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="active" defaultChecked={member?.active ?? true} className="h-4 w-4 accent-sky-500" />
            Ativo (aparece na lista de responsáveis)
          </label>
        </div>

        {erro && <p className="mt-3 text-sm font-medium text-danger">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Salvar
          </button>
        </div>
      </form>
    </Overlay>
  );
}
