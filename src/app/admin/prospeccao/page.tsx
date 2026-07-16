import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, fullDate } from "@/lib/utils";
import { NewLeadForm } from "./new-lead-form";

export const dynamic = "force-dynamic";

export default async function ProspeccaoPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Prospecção" subtitle="Base de empresas para abordagem comercial">
        <NewLeadForm />
      </PageHeader>

      {leads.length === 0 ? (
        <EmptyState title="Nenhuma empresa cadastrada" hint="Cadastre a primeira empresa para começar a prospecção." />
      ) : (
        <DataTable headers={["Empresa", "Contato", "Canal","Origem", "Segmento", "Cidade/UF", "Potencial", "Valor est.", "Etapa", "Responsável", "Criado"]}>
          {leads.map((l) => (
            <tr key={l.id} className="transition hover:bg-ink-800/50">
              <Td className="font-semibold text-slate-200">{l.companyName}</Td>
              <Td>{l.contactName ?? "—"}</Td>
              <Td className="text-xs">
                {[l.whatsapp && "WhatsApp", l.instagram && "Instagram", l.email && "E-mail", l.phone && "Telefone"]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Td>
              <Td>{l.source ?? "—"}</Td>
              <Td>{l.segment ?? "—"}</Td>
              <Td>{l.city ? `${l.city}/${l.state ?? ""}` : "—"}</Td>
              <Td>
                <Badge tone={l.potential === "Alto" ? "grow" : l.potential === "Baixo" ? "slate" : "brand"}>
                  {l.potential}
                </Badge>
              </Td>
              <Td>{Number(l.estimatedValue) > 0 ? brl(l.estimatedValue) : "—"}</Td>
              <Td><StatusBadge status={l.stage} /></Td>
              <Td>{l.owner?.name ?? "—"}</Td>
              <Td className="text-slate-500">{fullDate(l.createdAt)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
