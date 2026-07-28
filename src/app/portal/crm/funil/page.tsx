import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmFunnel } from "@/components/crm/crm-funnel";
import { CrmLeadForm } from "@/components/crm/crm-lead-form";
import { requireCrm, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { loadBase, loadFunnelLeads } from "@/lib/crm-page-data";
import { brl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FunilPage() {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");

  await ensureStages(ctx.clientId);
  const [base, leads] = await Promise.all([loadBase(ctx), loadFunnelLeads(ctx)]);

  const emAberto = leads
    .filter((l) => l.stageKind === "ABERTO")
    .reduce((s, l) => s + l.estimatedValue, 0);

  return (
    <>
      <PageHeader
        title="Funil de vendas"
        subtitle={`${leads.length} lead(s) · ${brl(emAberto)} em negociação — arraste os cartões entre as etapas`}
      >
        <CrmLeadForm stages={base.stages} members={base.members} tags={base.tags} scope={{}} />
      </PageHeader>
      <CrmFunnel stages={base.stages} leads={leads} scope={{}} basePath="/portal/crm" />
    </>
  );
}
