import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmDashboard } from "@/components/crm/crm-dashboard";
import { requireCrm, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { loadMetrics } from "@/lib/crm-page-data";

export const dynamic = "force-dynamic";

export default async function MeuCrmPage() {
  const ctx = await requireCrm();
  // O middleware já barrou quem não pode; aqui é a última rede de proteção
  if (isCrmError(ctx)) redirect("/portal");

  await ensureStages(ctx.clientId);
  const m = await loadMetrics(ctx);

  return (
    <>
      <PageHeader
        title="Meu CRM"
        subtitle="Seus leads, seu funil e seus números — dados exclusivos da sua empresa"
      />
      <CrmDashboard m={m} basePath="/portal/crm" />
    </>
  );
}
