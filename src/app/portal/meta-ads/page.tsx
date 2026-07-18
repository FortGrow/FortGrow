import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { metaDashboard } from "@/lib/ads-dashboard";
import { MetaAdsDashboard } from "@/components/ads/meta-dashboard";

export const dynamic = "force-dynamic";

export default async function MetaAdsPage({
  searchParams,
}: {
  searchParams: { dias?: string; campanha?: string; status?: string };
}) {
  const session = (await getSession())!;
  const days = Number(searchParams.dias ?? 30);
  const data = await metaDashboard(session.clientId!, {
    days,
    campaignId: searchParams.campanha,
    status: searchParams.status,
  });

  return (
    <>
      <PageHeader title="Meta Ads" subtitle="Suas campanhas do Facebook/Instagram, sincronizadas automaticamente" />
      <MetaAdsDashboard
        data={data}
        basePath="/portal/meta-ads"
        days={[7, 30, 90].includes(days) ? days : 30}
        campaignId={searchParams.campanha}
        status={searchParams.status}
      />
    </>
  );
}
