import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allowedClientIds, clientScopeWhere } from "@/lib/client-scope";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { fullDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { NewClientForm } from "./new-client-form";
import { ClientsBoard } from "./clients-board";
import { TrashActions } from "./trash-actions";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = (await getSession())!;
  const scope = await allowedClientIds(session);
  const restricted = scope !== null;

  const [clients, archived, plans] = await Promise.all([
    prisma.client.findMany({
      where: { archivedAt: null, ...clientScopeWhere(scope) },
      orderBy: { companyName: "asc" },
      include: {
        accountManager: { select: { name: true } },
        _count: { select: { projects: true, contracts: true } },
      },
    }),
    prisma.client.findMany({
      where: { archivedAt: { not: null }, ...clientScopeWhere(scope) },
      orderBy: { archivedAt: "desc" },
      select: { id: true, companyName: true, segment: true, plan: true, archivedAt: true },
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  const purgeDate = (archivedAt: Date) => new Date(archivedAt.getTime() + 30 * 86400000);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={restricted ? `${clients.length} cliente(s) vinculados a você por comissão` : `${clients.length} contas na carteira`}
      >
        {!restricted && <NewClientForm plans={plans.map((p) => ({ name: p.name, price: Number(p.price) }))} />}
      </PageHeader>
      <ClientsBoard
        clients={clients.map((c) => ({
          id: c.id,
          companyName: c.companyName,
          segment: c.segment,
          plan: c.plan,
          billingType: c.billingType,
          monthlyValue: Number(c.monthlyValue),
          commissionBase: Number(c.commissionBase),
          commissionShare: Number(c.commissionShare),
          city: c.city,
          state: c.state,
          status: c.status,
          managerName: c.accountManager?.name ?? null,
          projects: c._count.projects,
          contracts: c._count.contracts,
          contractStart: c.contractStart?.toISOString() ?? null,
        }))}
      />

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
