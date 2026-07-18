import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { brl, fullDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { NewClientForm } from "./new-client-form";
import { DeleteClientButton } from "./delete-client-button";
import { TrashActions } from "./trash-actions";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [clients, archived, plans] = await Promise.all([
    prisma.client.findMany({
      where: { archivedAt: null },
      orderBy: { companyName: "asc" },
      include: {
        accountManager: { select: { name: true } },
        _count: { select: { projects: true, contracts: true } },
      },
    }),
    prisma.client.findMany({
      where: { archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      select: { id: true, companyName: true, segment: true, plan: true, archivedAt: true },
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  const purgeDate = (archivedAt: Date) => new Date(archivedAt.getTime() + 30 * 86400000);

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.length} contas na carteira`}>
        <NewClientForm plans={plans.map((p) => ({ name: p.name, price: Number(p.price) }))} />
      </PageHeader>
      <DataTable headers={["Empresa", "Plano", "Cobrança", "Início", "Responsável", "Projetos", "Contratos", "Status", ""]}>
        {clients.map((c) => (
          <tr key={c.id} className="transition hover:bg-ink-800/50">
            <Td className="font-semibold text-slate-200">
              {c.companyName}
              {c.segment && <span className="ml-2 text-xs text-slate-500">{c.segment}</span>}
            </Td>
            <Td>{c.plan ?? "—"}</Td>
            <Td>
              {c.billingType === "COMISSAO" ? (
                <span className="text-xs font-semibold text-violet">
                  Comissão {Number(c.commissionBase)}% × {Number(c.commissionShare)}%
                  {Number(c.monthlyValue) > 0 && (
                    <span className="block font-medium text-slate-400">+ {brl(c.monthlyValue)}/mês</span>
                  )}
                </span>
              ) : (
                `${brl(c.monthlyValue)}/mês`
              )}
            </Td>
            <Td className="text-slate-500">{fullDate(c.contractStart)}</Td>
            <Td>{c.accountManager?.name ?? "—"}</Td>
            <Td>{c._count.projects}</Td>
            <Td>{c._count.contracts}</Td>
            <Td><StatusBadge status={c.status} /></Td>
            <Td>
              <div className="flex items-center gap-1">
                <Link href={`/admin/clientes/${c.id}`} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                  Abrir →
                </Link>
                <DeleteClientButton clientId={c.id} companyName={c.companyName} />
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>

      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-300">
            <Trash2 size={15} className="text-slate-500" /> Lixeira
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Clientes arquivados ficam aqui por 30 dias e depois são excluídos automaticamente.
            Restaurar reativa a conta e os acessos ao portal.
          </p>
          <DataTable headers={["Empresa", "Plano", "Arquivado em", "Exclusão definitiva", ""]}>
            {archived.map((c) => (
              <tr key={c.id} className="opacity-80 transition hover:bg-ink-800/50">
                <Td className="font-semibold text-slate-300">
                  {c.companyName}
                  {c.segment && <span className="ml-2 text-xs text-slate-500">{c.segment}</span>}
                </Td>
                <Td>{c.plan ?? "—"}</Td>
                <Td className="text-slate-500">{fullDate(c.archivedAt!)}</Td>
                <Td className="text-xs text-danger/80">{fullDate(purgeDate(c.archivedAt!))}</Td>
                <Td>
                  <TrashActions clientId={c.id} companyName={c.companyName} />
                </Td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}
    </>
  );
}
