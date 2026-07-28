import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmSettings } from "@/components/crm/crm-settings";
import { requireCrm, isCrmError, ensureStages } from "@/lib/crm-tenant";
import { loadBase } from "@/lib/crm-page-data";

export const dynamic = "force-dynamic";

export default async function ConfigCrmPage() {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");

  await ensureStages(ctx.clientId);
  const base = await loadBase(ctx);

  return (
    <>
      <PageHeader
        title="Configurações do CRM"
        subtitle="Desenhe o seu funil e as etiquetas do jeito que a sua operação funciona"
      />
      <CrmSettings stages={base.stages} tags={base.tags} scope={{}} />
    </>
  );
}
