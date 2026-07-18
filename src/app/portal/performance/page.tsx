import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";

export const dynamic = "force-dynamic";

/** Portal do Cliente: acompanhamento dos lançamentos feitos pela equipe (somente leitura). */
export default async function PortalPerformancePage() {
  const session = (await getSession())!;
  return (
    <>
      <PageHeader
        title="Performance"
        subtitle="CAC, CPL, receita real e ROI — o retorno verdadeiro do seu investimento, atualizado pela equipe FortGrow"
      />
      <PerformanceDashboard clientId={session.clientId!} editable={false} />
    </>
  );
}
