"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Filtro por usuário da trilha de auditoria (?usuario=...). */
export function UserFilter({ users }: { users: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("usuario") ?? "";

  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/admin/auditoria?usuario=${encodeURIComponent(v)}` : "/admin/auditoria");
      }}
      className="input w-auto py-2 text-sm"
      aria-label="Filtrar por usuário"
    >
      <option value="">Todos os usuários</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
      <option value="sistema">Sistema (automações)</option>
    </select>
  );
}
