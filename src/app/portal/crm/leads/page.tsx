import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmLeadsView } from "@/components/crm/crm-leads-view";
import { requireCrm, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { loadBase } from "@/lib/crm-page-data";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");

  await ensureStages(ctx.clientId);
  const base = await loadBase(ctx);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Busque, filtre, importe e exporte a sua base — tudo isolado na sua empresa"
      />
      <CrmLeadsView
        stages={base.stages}
        members={base.members}
        tags={base.tags}
        sources={base.sources}
        scope={{}}
        basePath="/portal/crm"
      />
    </>
  );
}
