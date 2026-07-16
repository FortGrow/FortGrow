import { ChannelDashboard } from "../channel-dashboard";

export const dynamic = "force-dynamic";

export default function SeoPage({ searchParams }: { searchParams: { days?: string } }) {
  return (
    <ChannelDashboard
      channel="SEO"
      title="SEO"
      subtitle="Busca orgânica: tráfego, posições, backlinks e autoridade"
      searchDays={searchParams.days}
      trendKeys={[
        { key: "organicTraffic", label: "Tráfego orgânico" },
        { key: "conversions", label: "Conversões" },
      ]}
    />
  );
}
