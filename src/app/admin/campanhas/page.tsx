import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { brl, num, pct } from "@/lib/utils";
import { kpis, sumTotals } from "@/lib/metrics";
import { lastSync } from "@/lib/sync";
import { NewCampaignForm, CampaignToggle } from "./campaign-actions";

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

const OBJECTIVE_LABEL: Record<string, string> = {
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Vendas",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_APP_PROMOTION: "Promoção de app",
};

export default async function CampanhasPage() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [campaigns, metrics, clients, adCampaigns, syncedAt] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { companyName: true, id: true } } },
    }),
    prisma.metricSnapshot.findMany({ where: { date: { gte: since } } }),
    prisma.client.findMany({
      where: { status: { in: ["ATIVO", "ONBOARDING"] } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
    // Campanhas reais sincronizadas das contas de anúncio (Meta Ads)
    prisma.adCampaign.findMany({
      include: {
        client: { select: { id: true, companyName: true } },
        insights: { where: { date: { gte: since } } },
      },
      orderBy: { name: "asc" },
    }),
    lastSync(),
  ]);

  // KPIs de 30 dias por cliente+canal para enriquecer a listagem manual
  const byKey = new Map<string, ReturnType<typeof sumTotals>>();
  for (const m of metrics) {
    const key = `${m.clientId}:${m.channel}`;
    const cur = byKey.get(key);
    const merged = sumTotals([...(cur ? [cur] : []), m as never]);
    byKey.set(key, merged);
  }

  /* Campanhas sincronizadas: agrega as métricas de 30 dias de cada uma */
  const synced = adCampaigns.map((c) => {
    const t = c.insights.reduce(
      (a, i) => ({
        spend: a.spend + Number(i.spend),
        impressions: a.impressions + i.impressions,
        clicks: a.clicks + i.clicks,
        leads: a.leads + i.leads,
        conversions: a.conversions + i.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0 }
    );
    return {
      id: c.id,
      name: c.name,
      clientId: c.client.id,
      clientName: c.client.companyName,
      status: c.status,
      objective: c.objective ? OBJECTIVE_LABEL[c.objective] ?? c.objective : null,
      dailyBudget: Number(c.dailyBudget),
      ...t,
      cpl: t.leads > 0 ? t.spend / t.leads : null,
      ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null,
    };
  });
  const syncedTotals = synced.reduce(
    (a, c) => ({
      spend: a.spend + c.spend,
      impressions: a.impressions + c.impressions,
      clicks: a.clicks + c.clicks,
      leads: a.leads + c.leads,
      conversions: a.conversions + c.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0 }
  );

  return (
    <>
      <PageHeader title="Campanhas" subtitle="Performance consolidada dos últimos 30 dias por campanha">
        <NewCampaignForm clients={clients.map((c) => ({ id: c.id, name: c.companyName }))} />
      </PageHeader>

      {/* Campanhas reais sincronizadas das contas de anúncio */}
      {synced.length > 0 ? (
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-300">Campanhas sincronizadas · Meta Ads</h2>
            <span className="text-xs text-slate-500">
              {syncedAt
                ? `última sincronização ${syncedAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                : "ainda não sincronizado"}
              {" · "}
              <Link href="/admin/integracoes" className="text-brand-400 hover:text-brand-300">
                atualizar em Integrações →
              </Link>
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Investimento (30d)" value={brl(syncedTotals.spend)} accent="warn" />
            <StatCard label="Leads (30d)" value={num(syncedTotals.leads)} accent="brand" />
            <StatCard label="Cliques (30d)" value={num(syncedTotals.clicks)} accent="violet" />
            <StatCard
              label="CPL médio"
              value={syncedTotals.leads > 0 ? brl(syncedTotals.spend / syncedTotals.leads) : "—"}
              hint="investimento / leads"
              accent="grow"
            />
            <StatCard label="Impressões (30d)" value={num(syncedTotals.impressions)} accent="brand" />
          </div>

          <DataTable
            headers={["Campanha", "Cliente / conta", "Objetivo", "Orçamento/dia", "Invest. 30d", "Impressões", "Cliques", "Leads", "CPL", "CTR", "Status", ""]}
          >
            {synced.map((c) => (
              <tr key={c.id} className="transition hover:bg-ink-800/50">
                <Td className="font-semibold text-slate-200">{c.name}</Td>
                <Td>{c.clientName}</Td>
                <Td>{c.objective ?? "—"}</Td>
                <Td>{c.dailyBudget > 0 ? brl(c.dailyBudget) : "—"}</Td>
                <Td>{brl(c.spend)}</Td>
                <Td>{num(c.impressions)}</Td>
                <Td>{num(c.clicks)}</Td>
                <Td>{num(c.leads)}</Td>
                <Td>{c.cpl === null ? "—" : brl(c.cpl)}</Td>
                <Td>{c.ctr === null ? "—" : pct(c.ctr)}</Td>
                <Td>
                  <Badge tone={c.status === "ACTIVE" ? "grow" : "slate"}>{c.status === "ACTIVE" ? "ATIVA" : c.status ?? "—"}</Badge>
                </Td>
                <Td>
                  <Link
                    href={`/admin/clientes/${c.clientId}/campanhas`}
                    title="Abrir dashboard completo"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
                  >
                    <ExternalLink size={12} /> dashboard
                  </Link>
                </Td>
              </tr>
            ))}
          </DataTable>
        </div>
      ) : (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-line/60 bg-ink-900/40 px-4 py-3.5 text-sm text-slate-500">
          <RefreshCw size={15} className="mt-0.5 shrink-0" />
          <span>
            Nenhuma campanha sincronizada ainda. Conecte o <b className="text-slate-300">Meta Ads</b> em{" "}
            <Link href="/admin/integracoes" className="text-brand-400 hover:text-brand-300">Integrações</Link>, vincule a
            conta de anúncios na ficha do cliente (Integração de campanhas) e clique em{" "}
            <b className="text-slate-300">Atualizar agora</b> — as campanhas e métricas reais aparecem aqui.
          </span>
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-300">Campanhas cadastradas manualmente</h2>
      <DataTable headers={["Campanha", "Cliente", "Canal", "Orçamento", "Invest. 30d", "Leads 30d", "CTR", "ROAS", "Status", ""]}>
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
              <Td>
                <CampaignToggle id={c.id} active={c.active} />
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
