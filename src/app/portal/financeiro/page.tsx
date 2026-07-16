import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { brl, fullDate } from "@/lib/utils";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalFinanceiroPage() {
  const session = (await getSession())!;
  const clientId = session.clientId!;

  const [client, invoices, contracts] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { monthlyValue: true, plan: true } }),
    prisma.invoice.findMany({ where: { clientId }, orderBy: { dueDate: "desc" }, take: 24 }),
    prisma.contract.findMany({ where: { clientId }, orderBy: { startDate: "desc" } }),
  ]);

  const paid = invoices.filter((i) => i.status === "PAGO").reduce((s, i) => s + Number(i.amount), 0);
  const open = invoices.filter((i) => i.status === "EM_ABERTO").reduce((s, i) => s + Number(i.amount), 0);
  const overdue = invoices.filter((i) => i.status === "ATRASADO").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Mensalidades, pagamentos, contratos e notas fiscais" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Mensalidade" value={brl(client?.monthlyValue)} hint={client?.plan ?? undefined} accent="brand" />
        <StatCard label="Recebidos" value={brl(paid)} accent="grow" />
        <StatCard label="Em aberto" value={brl(open)} accent="warn" />
        <StatCard label="Em atraso" value={brl(overdue)} accent={overdue > 0 ? "danger" : "grow"} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-300">Histórico de cobranças</h2>
        <DataTable headers={["Descrição", "Valor", "Vencimento", "Pago em", "Método", "NF", "Status"]}>
          {invoices.map((i) => (
            <tr key={i.id} className="transition hover:bg-ink-800/50">
              <Td className="font-medium text-slate-200">{i.description}</Td>
              <Td>{brl(i.amount)}</Td>
              <Td className="text-slate-500">{fullDate(i.dueDate)}</Td>
              <Td className="text-slate-500">{fullDate(i.paidAt)}</Td>
              <Td>{i.method ?? "—"}</Td>
              <Td>
                {i.nfeUrl ? (
                  <a href={i.nfeUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300">
                    <FileText size={13} /> Nota
                  </a>
                ) : (
                  "—"
                )}
              </Td>
              <Td><StatusBadge status={i.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-300">Contratos</h2>
        <DataTable headers={["Contrato", "Valor", "Início", "Término", "Status"]}>
          {contracts.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium text-slate-200">{c.title}</Td>
              <Td>{brl(c.value)}</Td>
              <Td className="text-slate-500">{fullDate(c.startDate)}</Td>
              <Td className="text-slate-500">{fullDate(c.endDate)}</Td>
              <Td><StatusBadge status={c.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
