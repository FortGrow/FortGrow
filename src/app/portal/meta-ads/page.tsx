import { ChannelDashboard } from "../channel-dashboard";

export const dynamic = "force-dynamic";

export default function MetaAdsPage({ searchParams }: { searchParams: { days?: string } }) {
  return (
    <ChannelDashboard
      channel="META_ADS"
      title="Meta Ads"
      subtitle="Métricas sincronizadas do Gerenciador de Anúncios (Facebook/Instagram)"
      searchDays={searchParams.days}
      trendKeys={[
        { key: "leads", label: "Leads" },
        { key: "reach", label: "Alcance" },
      ]}
    />
  );
}
