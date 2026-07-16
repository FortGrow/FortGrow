import { ChannelDashboard } from "../channel-dashboard";

export const dynamic = "force-dynamic";

export default function InstagramPage({ searchParams }: { searchParams: { days?: string } }) {
  return (
    <ChannelDashboard
      channel="INSTAGRAM"
      title="Instagram"
      subtitle="Crescimento e engajamento do perfil"
      searchDays={searchParams.days}
      trendKeys={[
        { key: "followers", label: "Seguidores" },
        { key: "engagement", label: "Engajamento" },
      ]}
    />
  );
}
