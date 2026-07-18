/**
 * Consulta e agrega os dados sincronizados de campanhas (AdCampaign/AdInsight)
 * para os dashboards Meta Ads — admin (por cliente) e portal.
 */
import { prisma } from "@/lib/prisma";

export type CampaignRow = {
  id: string;
  name: string;
  status: string | null;
  objective: string | null;
  dailyBudget: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  leads: number;
  conversions: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpl: number;
  frequency: number;
};

export type AdSetRow = {
  id: string;
  campaignName: string;
  name: string;
  status: string | null;
  budget: number;
  audience: string | null;
  adsCount: number;
};

export type MetaDashData = {
  campaigns: CampaignRow[];
  adSets: AdSetRow[];
  daily: { label: string; investimento: number; leads: number; cliques: number }[];
  totals: {
    spend: number;
    leads: number;
    conversions: number;
    impressions: number;
    reach: number;
    clicks: number;
    linkClicks: number;
    cpl: number;
    cpc: number;
    cpm: number;
    ctr: number;
    roi: number | null;
    frequency: number;
  };
  statuses: string[];
  lastSyncedAt: Date | null;
  hasAccount: boolean;
};

export async function metaDashboard(
  clientId: string,
  options: { days?: number; campaignId?: string; status?: string } = {}
): Promise<MetaDashData> {
  const days = options.days && [7, 30, 90].includes(options.days) ? options.days : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { adAccounts: true } });
  const hasAccount = Boolean((client?.adAccounts as { metaAdsId?: string } | null)?.metaAdsId);

  const campaignWhere = {
    clientId,
    provider: "META",
    ...(options.campaignId ? { id: options.campaignId } : {}),
    ...(options.status ? { status: options.status } : {}),
  };

  const [campaigns, allStatuses] = await Promise.all([
    prisma.adCampaign.findMany({
      where: campaignWhere,
      include: {
        insights: { where: { date: { gte: since } } },
        adSets: { include: { _count: { select: { ads: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.adCampaign.findMany({
      where: { clientId, provider: "META" },
      select: { status: true },
      distinct: ["status"],
    }),
  ]);

  const dailyMap = new Map<string, { investimento: number; leads: number; cliques: number }>();
  const totals = {
    spend: 0, leads: 0, conversions: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0,
    cpl: 0, cpc: 0, cpm: 0, ctr: 0, roi: null as number | null, frequency: 0,
  };
  let freqWeight = 0;

  const rows: CampaignRow[] = campaigns.map((c) => {
    const agg = { impressions: 0, reach: 0, clicks: 0, linkClicks: 0, leads: 0, conversions: 0, spend: 0, freq: 0, freqW: 0 };
    for (const i of c.insights) {
      agg.impressions += i.impressions;
      agg.reach += i.reach;
      agg.clicks += i.clicks;
      agg.linkClicks += i.linkClicks;
      agg.leads += i.leads;
      agg.conversions += i.conversions;
      agg.spend += Number(i.spend);
      agg.freq += i.frequency * i.impressions;
      agg.freqW += i.impressions;

      const key = i.date.toISOString().slice(0, 10);
      const d = dailyMap.get(key) ?? { investimento: 0, leads: 0, cliques: 0 };
      d.investimento += Number(i.spend);
      d.leads += i.leads;
      d.cliques += i.linkClicks || i.clicks;
      dailyMap.set(key, d);
    }
    totals.spend += agg.spend;
    totals.leads += agg.leads;
    totals.conversions += agg.conversions;
    totals.impressions += agg.impressions;
    totals.reach += agg.reach;
    totals.clicks += agg.clicks;
    totals.linkClicks += agg.linkClicks;
    totals.frequency += agg.freq;
    freqWeight += agg.freqW;

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: Number(c.dailyBudget),
      ...agg,
      cpc: agg.linkClicks > 0 ? agg.spend / agg.linkClicks : agg.clicks > 0 ? agg.spend / agg.clicks : 0,
      cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
      ctr: agg.impressions > 0 ? ((agg.linkClicks || agg.clicks) / agg.impressions) * 100 : 0,
      cpl: agg.leads > 0 ? agg.spend / agg.leads : 0,
      frequency: agg.freqW > 0 ? agg.freq / agg.freqW : 0,
    };
  });

  totals.cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  totals.cpc = totals.linkClicks > 0 ? totals.spend / totals.linkClicks : totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  totals.ctr = totals.impressions > 0 ? ((totals.linkClicks || totals.clicks) / totals.impressions) * 100 : 0;
  totals.frequency = freqWeight > 0 ? totals.frequency / freqWeight : 0;

  // ROI: usa a receita registrada no período (snapshots do canal) quando existir
  const revenueAgg = await prisma.metricSnapshot.aggregate({
    where: { clientId, channel: "META_ADS", date: { gte: since } },
    _sum: { revenue: true },
  });
  const revenue = Number(revenueAgg._sum.revenue ?? 0);
  totals.roi = totals.spend > 0 && revenue > 0 ? ((revenue - totals.spend) / totals.spend) * 100 : null;

  const daily = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({
      label: new Date(`${k}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      investimento: Math.round(v.investimento * 100) / 100,
      leads: v.leads,
      cliques: v.cliques,
    }));

  const adSets: AdSetRow[] = campaigns.flatMap((c) =>
    c.adSets.map((s) => ({
      id: s.id,
      campaignName: c.name,
      name: s.name,
      status: s.status,
      budget: Number(s.budget),
      audience: s.audience,
      adsCount: s._count.ads,
    }))
  );

  const lastSyncedAt = campaigns.reduce<Date | null>(
    (max, c) => (!max || c.syncedAt > max ? c.syncedAt : max),
    null
  );

  return {
    campaigns: rows.sort((a, b) => b.spend - a.spend),
    adSets,
    daily,
    totals,
    statuses: allStatuses.map((s) => s.status).filter((s): s is string => Boolean(s)),
    lastSyncedAt,
    hasAccount,
  };
}
