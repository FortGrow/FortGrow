import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { type KanbanColumn } from "@/components/kanban/kanban";
import { brl } from "@/lib/utils";
import { FUNNEL_STAGES } from "@/lib/lead-taxonomy";
import { leadToDto } from "@/lib/lead-dto";
import { NewLeadForm } from "@/app/admin/prospeccao/new-lead-form";
import { CrmView } from "./crm-view";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true } } },
  });
  const dto = leads.map(leadToDto);

  const columns: KanbanColumn[] = FUNNEL_STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    accent: s.color,
    cards: leads
      .filter((l) => l.stage === s.key)
      .map((l) => ({
        id: l.id,
        title: l.companyName,
        subtitle: l.contactName ?? l.segment ?? undefined,
        meta: Number(l.estimatedValue) > 0 ? brl(l.estimatedValue) : undefined,
        badge: l.potential ?? undefined,
        badgeTone: l.potential === "Alto" ? "grow" : l.potential === "Baixo" ? "slate" : "brand",
      })),
  }));

  const pipelineValue = leads
    .filter((l) => !["FECHADO", "PERDIDO"].includes(l.stage))
    .reduce((s, l) => s + Number(l.estimatedValue), 0);

  return (
    <>
      <PageHeader
        title="CRM Comercial"
        subtitle={`Pipeline aberto: ${brl(pipelineValue)} · mesmo padrão da Prospecção, evoluindo até o fechamento`}
      >
        <NewLeadForm />
      </PageHeader>
      <CrmView leads={dto} columns={columns} />
    </>
  );
}
