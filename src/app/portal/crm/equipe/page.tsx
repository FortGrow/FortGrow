import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CrmTeam } from "@/components/crm/crm-team";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";
import { loadBase, loadTeamPerformance } from "@/lib/crm-page-data";

export const dynamic = "force-dynamic";

export default async function EquipeCrmPage() {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");

  const [base, desempenho] = await Promise.all([loadBase(ctx), loadTeamPerformance(ctx)]);

  return (
    <>
      <PageHeader
        title="Equipe"
        subtitle="Quem atende os leads, em que departamento e com qual meta mensal"
      />
      <CrmTeam members={base.members} logins={base.logins} desempenho={desempenho} scope={{}} />
    </>
  );
}
