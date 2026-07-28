import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmAgenda } from "@/components/crm/crm-agenda";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";
import { loadBase, loadLeadOptions } from "@/lib/crm-page-data";

export const dynamic = "force-dynamic";

export default async function AgendaCrmPage() {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");

  const [base, leads] = await Promise.all([loadBase(ctx), loadLeadOptions(ctx)]);

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Ligações, reuniões, tarefas e follow-ups — o que é agendado num lead aparece aqui"
      />
      <CrmAgenda scope={{}} members={base.members} leads={leads} basePath="/portal/crm" />
    </>
  );
}
