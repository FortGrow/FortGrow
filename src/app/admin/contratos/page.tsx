import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { brl, fullDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const contracts = await prisma.contract.findMany({
    orderBy: { startDate: "desc" },
    include: { client: { select: { companyName: true } } },
  });

  const soon = new Date(Date.now() + 30 * 86400000);

  return (
    <>
      <PageHeader title="Contratos" subtitle={`${contracts.filter((c) => c.status === "ATIVO").length} contratos ativos`} />
      <DataTable headers={["Cliente", "Contrato", "Valor", "Início", "Término", "Renovação", "Status"]}>
        {contracts.map((c) => (
          <tr key={c.id} className="transition hover:bg-ink-800/50">
            <Td className="font-semibold text-slate-200">{c.client.companyName}</Td>
            <Td>{c.title}</Td>
            <Td>{brl(c.value)}</Td>
            <Td className="text-slate-500">{fullDate(c.startDate)}</Td>
            <Td className="text-slate-500">
              {fullDate(c.endDate)}
              {c.endDate && c.endDate < soon && c.status === "ATIVO" && (
                <Badge tone="warn" className="ml-2">vence em breve</Badge>
              )}
            </Td>
            <Td>{c.autoRenew ? "Automática" : "Manual"}</Td>
            <Td><StatusBadge status={c.status} /></Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
