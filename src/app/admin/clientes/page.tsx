import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { brl, fullDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({
    orderBy: { companyName: "asc" },
    include: {
      accountManager: { select: { name: true } },
      _count: { select: { projects: true, contracts: true } },
    },
  });

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.length} contas na carteira`} />
      <DataTable headers={["Empresa", "Plano", "Valor mensal", "Início", "Responsável", "Projetos", "Contratos", "Status", ""]}>
        {clients.map((c) => (
          <tr key={c.id} className="transition hover:bg-ink-800/50">
            <Td className="font-semibold text-slate-200">
              {c.companyName}
              {c.segment && <span className="ml-2 text-xs text-slate-500">{c.segment}</span>}
            </Td>
            <Td>{c.plan ?? "—"}</Td>
            <Td>{brl(c.monthlyValue)}</Td>
            <Td className="text-slate-500">{fullDate(c.contractStart)}</Td>
            <Td>{c.accountManager?.name ?? "—"}</Td>
            <Td>{c._count.projects}</Td>
            <Td>{c._count.contracts}</Td>
            <Td><StatusBadge status={c.status} /></Td>
            <Td>
              <Link href={`/admin/clientes/${c.id}`} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                Abrir →
              </Link>
            </Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
