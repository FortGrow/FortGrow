import { ChannelDashboard } from "../channel-dashboard";

export const dynamic = "force-dynamic";

export default function GoogleAdsPage({ searchParams }: { searchParams: { days?: string } }) {
  return (
    <ChannelDashboard
      channel="GOOGLE_ADS"
      title="Google Ads"
      subtitle="Métricas sincronizadas da conta Google Ads"
      searchDays={searchParams.days}
      trendKeys={[
        { key: "clicks", label: "Cliques" },
        { key: "conversions", label: "Conversões" },
      ]}
    />
  );
}
