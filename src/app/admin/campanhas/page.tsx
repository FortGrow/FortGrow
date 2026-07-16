import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl, num, pct } from "@/lib/utils";
import { kpis, sumTotals } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL: Record<string, string> = {
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  INSTAGRAM: "Instagram",
  SEO: "SEO",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  EMAIL: "E-mail",
  OUTRO: "Outro",
};

export default async function CampanhasPage() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [campaigns, metrics] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { companyName: true, id: true } } },
    }),
    prisma.metricSnapshot.findMany({ where: { date: { gte: since } } }),
  ]);

  // KPIs de 30 dias por cliente+canal para enriquecer a listagem
  const byKey = new Map<string, ReturnType<typeof sumTotals>>();
  for (const m of metrics) {
    const key = `${m.clientId}:${m.channel}`;
    const cur = byKey.get(key);
    const merged = sumTotals([...(cur ? [cur] : []), m as never]);
    byKey.set(key, merged);
  }

  return (
    <>
      <PageHeader title="Campanhas" subtitle="Performance consolidada dos últimos 30 dias por campanha" />
      <DataTable headers={["Campanha", "Cliente", "Canal", "Orçamento", "Invest. 30d", "Leads 30d", "CTR", "ROAS", "Status"]}>
        {campaigns.map((c) => {
          const t = byKey.get(`${c.client.id}:${c.channel}`);
          return (
            <tr key={c.id} className="transition hover:bg-ink-800/50">
              <Td className="font-semibold text-slate-200">{c.name}</Td>
              <Td>{c.client.companyName}</Td>
              <Td><Badge tone="brand">{CHANNEL_LABEL[c.channel]}</Badge></Td>
              <Td>{brl(c.budget)}</Td>
              <Td>{t ? brl(t.spend) : "—"}</Td>
              <Td>{t ? num(t.leads) : "—"}</Td>
              <Td>{t ? pct(kpis.ctr(t)) : "—"}</Td>
              <Td>{t ? `${kpis.roas(t).toFixed(2)}x` : "—"}</Td>
              <Td>
                <Badge tone={c.active ? "grow" : "slate"}>{c.active ? "ATIVA" : "PAUSADA"}</Badge>
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
