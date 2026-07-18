import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewLeadForm } from "./new-lead-form";
import { ProspectingBoard } from "./prospecting-board";

export const dynamic = "force-dynamic";

export default async function ProspeccaoPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  const dto = leads.map((l) => ({
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName,
    email: l.email,
    phone: l.phone,
    whatsapp: l.whatsapp,
    instagram: l.instagram,
    facebook: l.facebook,
    linkedin: l.linkedin,
    website: l.website,
    source: l.source,
    segment: l.segment,
    city: l.city,
    state: l.state,
    potential: l.potential,
    estimatedValue: Number(l.estimatedValue),
    notes: l.notes,
    stage: l.stage,
    ownerName: l.owner?.name ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Prospecção"
        subtitle="Cards por potencial (vermelho baixo · azul médio · verde alto) e métricas de conversão"
      >
        <NewLeadForm />
      </PageHeader>

      {dto.length === 0 ? (
        <EmptyState title="Nenhuma empresa cadastrada" hint="Cadastre a primeira empresa para começar a prospecção." />
      ) : (
        <ProspectingBoard leads={dto} />
      )}
    </>
  );
}
