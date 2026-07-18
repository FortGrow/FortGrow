import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";

export const dynamic = "force-dynamic";

/**
 * Visão geral do Portal do Cliente: o cliente entra e vê resultados —
 * leitura estratégica, métricas consolidadas, gráficos e Instagram.
 * Dados cadastrais/contratuais ficam na aba "Dados do Cliente".
 */
export default async function PortalHome() {
  const session = (await getSession())!;
  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="O que está acontecendo com o seu marketing — resultados e métricas atualizados pela equipe FortGrow"
      />
      <PerformanceDashboard clientId={session.clientId!} editable={false} />
    </>
  );
}
