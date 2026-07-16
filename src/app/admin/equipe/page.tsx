import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MODULES, ROLE_DEFAULTS, type ModuleKey } from "@/lib/rbac";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const session = (await getSession())!;
  const users = await prisma.user.findMany({
    where: { role: { not: "CLIENTE" } },
    orderBy: { name: "asc" },
    include: { client: { select: { companyName: true } } },
  });
  const clientUsers = await prisma.user.findMany({
    where: { role: "CLIENTE" },
    orderBy: { name: "asc" },
    include: { client: { select: { companyName: true } } },
  });

  const modulesOf = (u: (typeof users)[number]): string[] => {
    if (u.role === "ADMIN") return ["Acesso total"];
    const keys = (u.permissions.length ? u.permissions : ROLE_DEFAULTS[u.role] ?? []) as ModuleKey[];
    return keys.map((k) => MODULES[k] ?? k);
  };

  return (
    <>
      <PageHeader
        title="Equipe & Permissões"
        subtitle={`${users.length} colaboradores · ${clientUsers.length} acessos de cliente`}
      />

      <h2 className="mb-3 text-sm font-bold text-slate-300">Colaboradores</h2>
      <DataTable headers={["Colaborador", "Papel", "Módulos liberados", "2FA", "Status"]} className="mb-8">
        {users.map((u) => (
          <tr key={u.id} className="transition hover:bg-ink-800/50">
            <Td>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-brand-300">
                  {initials(u.name)}
                </span>
                <div>
                  <p className="font-semibold text-slate-200">
                    {u.name}
                    {u.id === session.sub && <span className="ml-2 text-xs text-slate-500">(você)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
            </Td>
            <Td><Badge tone={u.role === "ADMIN" ? "violet" : "brand"}>{u.role.replaceAll("_", " ")}</Badge></Td>
            <Td className="max-w-md">
              <span className="text-xs text-slate-400">{modulesOf(u).join(" · ")}</span>
            </Td>
            <Td>{u.twoFactor ? <Badge tone="grow">ativo</Badge> : <span className="text-xs text-slate-600">—</span>}</Td>
            <Td><Badge tone={u.active ? "grow" : "danger"}>{u.active ? "ATIVO" : "INATIVO"}</Badge></Td>
          </tr>
        ))}
      </DataTable>

      <h2 className="mb-3 text-sm font-bold text-slate-300">Acessos de clientes (Portal)</h2>
      <DataTable headers={["Usuário", "Empresa", "Status"]}>
        {clientUsers.map((u) => (
          <tr key={u.id} className="transition hover:bg-ink-800/50">
            <Td>
              <p className="font-semibold text-slate-200">{u.name}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
            </Td>
            <Td>{u.client?.companyName ?? "—"}</Td>
            <Td><Badge tone={u.active ? "grow" : "danger"}>{u.active ? "ATIVO" : "INATIVO"}</Badge></Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
