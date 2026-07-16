import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { TrendChart } from "@/components/charts/trend-chart";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { loadMetrics, bucketize, totalsOf, parseDays } from "@/lib/portal-data";
import { kpis, type ChannelTotals } from "@/lib/metrics";
import { brl, num, pct } from "@/lib/utils";
import type { Channel } from "@prisma/client";

type Accent = "brand" | "grow" | "warn" | "danger" | "violet";
type KpiDef = { label: string; value: (t: ChannelTotals) => string; accent: Accent };

export const KPI_PRESETS: Record<string, KpiDef[]> = {
  GOOGLE_ADS: [
    { label: "Conversões", value: (t) => num(t.conversions), accent: "grow" },
    { label: "Custo", value: (t) => brl(t.spend), accent: "warn" },
    { label: "Cliques", value: (t) => num(t.clicks), accent: "brand" },
    { label: "CTR", value: (t) => pct(kpis.ctr(t), 2), accent: "brand" },
    { label: "CPA", value: (t) => brl(kpis.cpa(t)), accent: "violet" },
    { label: "ROAS", value: (t) => `${kpis.roas(t).toFixed(2)}x`, accent: "violet" },
    { label: "ROI", value: (t) => pct(kpis.roi(t)), accent: "violet" },
    { label: "Impressões", value: (t) => num(t.impressions), accent: "brand" },
  ],
  META_ADS: [
    { label: "Leads", value: (t) => num(t.leads), accent: "brand" },
    { label: "Conversões", value: (t) => num(t.conversions), accent: "grow" },
    { label: "CPM", value: (t) => brl(kpis.cpm(t)), accent: "warn" },
    { label: "CPC", value: (t) => brl(kpis.cpc(t)), accent: "warn" },
    { label: "CTR", value: (t) => pct(kpis.ctr(t), 2), accent: "brand" },
    { label: "Alcance", value: (t) => num(t.reach), accent: "violet" },
    { label: "Investimento", value: (t) => brl(t.spend), accent: "warn" },
    { label: "ROAS", value: (t) => `${kpis.roas(t).toFixed(2)}x`, accent: "violet" },
  ],
  INSTAGRAM: [
    { label: "Seguidores", value: (t) => num(t.followers), accent: "violet" },
    { label: "Alcance", value: (t) => num(t.reach), accent: "brand" },
    { label: "Engajamento", value: (t) => num(t.engagement), accent: "grow" },
    { label: "Impressões", value: (t) => num(t.impressions), accent: "brand" },
  ],
  SEO: [
    { label: "Tráfego orgânico", value: (t) => num((t as never as { organicTraffic?: number }).organicTraffic ?? 0), accent: "brand" },
    { label: "Conversões", value: (t) => num(t.conversions), accent: "grow" },
    { label: "Cliques", value: (t) => num(t.clicks), accent: "brand" },
    { label: "Impressões", value: (t) => num(t.impressions), accent: "violet" },
  ],
};

export async function ChannelDashboard({
  channel,
  title,
  subtitle,
  searchDays,
  trendKeys,
}: {
  channel: Channel;
  title: string;
  subtitle: string;
  searchDays?: string;
  trendKeys: { key: string; label: string }[];
}) {
  const session = (await getSession())!;
  const days = parseDays(searchDays);
  const rows = await loadMetrics(session.clientId!, days, channel);
  const t = totalsOf(rows);
  const buckets = bucketize(rows, days);

  const seo = channel === "SEO";
  const seoAgg = seo
    ? rows.reduce(
        (acc, r) => ({
          organicTraffic: acc.organicTraffic + r.organicTraffic,
          backlinks: Math.max(acc.backlinks, r.backlinks),
          authority: Math.max(acc.authority, r.authority),
          avgPosition: r.avgPosition || acc.avgPosition,
        }),
        { organicTraffic: 0, backlinks: 0, authority: 0, avgPosition: 0 }
      )
    : null;

  const totalsForKpi = seo ? ({ ...t, organicTraffic: seoAgg!.organicTraffic } as never) : t;

  const trendData = buckets.map((b) => {
    const row: Record<string, unknown> = { label: b.label };
    for (const k of trendKeys) row[k.key] = (b as never as Record<string, number>)[k.key] ?? 0;
    return row;
  });

  const campaigns = await prisma.campaign.findMany({
    where: { clientId: session.clientId!, channel },
    orderBy: { active: "desc" },
  });

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        <PeriodFilter current={days} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(KPI_PRESETS[channel] ?? []).map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value(totalsForKpi)} accent={k.accent} />
        ))}
        {seo && seoAgg && (
          <>
            <StatCard label="Posição média" value={seoAgg.avgPosition.toFixed(1)} accent="warn" />
            <StatCard label="Backlinks" value={num(seoAgg.backlinks)} accent="violet" />
            <StatCard label="Autoridade de domínio" value={num(seoAgg.authority)} accent="grow" />
            <StatCard label="Investimento" value={brl(t.spend)} accent="warn" />
          </>
        )}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-300">Evolução no período</h2>
        <TrendChart data={trendData} series={trendKeys} />
      </div>

      {campaigns.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-slate-300">Campanhas</h2>
          <DataTable headers={["Campanha", "Objetivo", "Orçamento", "Status"]}>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium text-slate-200">{c.name}</Td>
                <Td>{c.objective ?? "—"}</Td>
                <Td>{brl(c.budget)}</Td>
                <Td>
                  <Badge tone={c.active ? "grow" : "slate"}>{c.active ? "ATIVA" : "PAUSADA"}</Badge>
                </Td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </>
  );
}
