import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { brl, fullDate } from "@/lib/utils";
import { FileDown, FileCheck2 } from "lucide-react";
import { NewContractForm } from "./new-contract-form";
import { TemplatesPanel } from "./templates-panel";
import { ContractRowActions } from "./contract-row-actions";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const session = (await getSession())!;
  const [contracts, clients, templates] = await Promise.all([
    prisma.contract.findMany({
      orderBy: { startDate: "desc" },
      include: { client: { select: { companyName: true } } },
    }),
    prisma.client.findMany({
      where: { archivedAt: null },
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        cnpj: true,
        email: true,
        phone: true,
        billingType: true,
        monthlyValue: true,
        commissionBase: true,
        commissionShare: true,
        plan: true,
        contractStart: true,
        contractMonths: true,
      },
    }),
    prisma.contractTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);
  const canEdit = can(session, "contratos", "edit");

  const soon = new Date(Date.now() + 30 * 86400000);
  const aguardando = contracts.filter((c) => c.fileUrl && !c.signedFileUrl).length;

  return (
    <>
      <PageHeader
        title="Contratos"
        subtitle={`${contracts.filter((c) => c.status === "ATIVO").length} contratos ativos${
          aguardando > 0 ? ` · ${aguardando} aguardando assinatura` : ""
        }`}
      >
        {canEdit && (
          <NewContractForm
            templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            clients={clients.map((c) => ({
              id: c.id,
              companyName: c.companyName,
              cnpj: c.cnpj,
              email: c.email,
              phone: c.phone,
              billingType: c.billingType,
              monthlyValue: Number(c.monthlyValue),
              commissionBase: Number(c.commissionBase),
              commissionShare: Number(c.commissionShare),
              plan: c.plan,
              contractStart: c.contractStart?.toISOString().slice(0, 10) ?? null,
              contractMonths: c.contractMonths,
            }))}
          />
        )}
      </PageHeader>

      {/* Estrutura própria de contrato — adicionar, editar e excluir modelos */}
      {canEdit && (
        <TemplatesPanel
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            body: t.body,
            updatedAt: t.updatedAt.toISOString(),
          }))}
        />
      )}

      <DataTable headers={["Cliente", "Contrato", "Valor", "Início", "Término", "Renovação", "Status", "Assinatura", "Arquivos", ...(canEdit ? [""] : [])]}>
        {contracts.map((c) => (
          <tr key={c.id} className="transition hover:bg-ink-800/50">
            <Td className="font-semibold text-slate-200">{c.client.companyName}</Td>
            <Td>{c.title}</Td>
            <Td>{Number(c.value) > 0 ? brl(c.value) : "—"}</Td>
            <Td className="text-slate-500">{fullDate(c.startDate)}</Td>
            <Td className="text-slate-500">
              {c.endDate ? fullDate(c.endDate) : "indeterminado"}
              {c.endDate && c.endDate < soon && c.status === "ATIVO" && (
                <Badge tone="warn" className="ml-2">vence em breve</Badge>
              )}
            </Td>
            <Td>{c.autoRenew ? "Automática" : "Manual"}</Td>
            <Td><StatusBadge status={c.status} /></Td>
            <Td>
              {c.signedFileUrl ? (
                <Badge tone="grow">assinado {c.signedAt ? `em ${fullDate(c.signedAt)}` : ""}</Badge>
              ) : c.fileUrl ? (
                <Badge tone="warn">aguardando assinatura</Badge>
              ) : (
                <span className="text-xs text-slate-600">sem documento</span>
              )}
            </Td>
            <Td>
              <span className="flex items-center gap-2">
                {c.fileUrl && (
                  <a
                    href={c.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="PDF do contrato (para assinatura)"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
                  >
                    <FileDown size={13} /> contrato
                  </a>
                )}
                {c.signedFileUrl && (
                  <a
                    href={c.signedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="PDF assinado via gov.br"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-grow-400 hover:text-grow-300"
                  >
                    <FileCheck2 size={13} /> assinado
                  </a>
                )}
                {!c.fileUrl && !c.signedFileUrl && <span className="text-xs text-slate-600">—</span>}
              </span>
            </Td>
            {canEdit && (
              <Td>
                <ContractRowActions contractId={c.id} title={c.title} />
              </Td>
            )}
          </tr>
        ))}
      </DataTable>
    </>
  );
}
