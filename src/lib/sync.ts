/**
 * Serviço de sincronização de campanhas.
 *
 * Para cada cliente ativo com conta Meta vinculada (ficha do cliente →
 * Integração de campanhas; aceita várias contas separadas por vírgula) e com a
 * integração meta_ads conectada, puxa da Graph API:
 *   campanhas → conjuntos → anúncios → métricas diárias (AdInsight)
 * e consolida o total do dia em MetricSnapshot (dashboards existentes).
 *
 * Arquitetura modular: cada provedor implementa syncClientProvider; Google Ads
 * e TikTok Ads entram aqui quando houver credenciais.
 *
 * Cache: uma execução completa só roda de novo depois de STALE_MINUTES — o
 * botão "Atualizar agora" força. Tudo fica registrado em SyncLog.
 */
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  audienceSummary,
  extractActions,
  fetchAds,
  fetchAdSets,
  fetchCampaigns,
  fetchDailyInsights,
} from "@/lib/providers/meta";

export const STALE_MINUTES = 15;

type AdAccounts = { googleAdsId?: string; metaAdsId?: string; instagram?: string; ga4PropertyId?: string };

export type SyncResult = {
  clientsProcessed: number;
  campaignsSynced: number;
  insightsUpserted: number;
  errors: number;
  details: string[];
};

const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Sincroniza uma conta Meta de um cliente. */
async function syncMetaAccount(
  clientId: string,
  accountId: string,
  token: string,
  result: SyncResult
): Promise<void> {
  const [campaigns, adSets, ads] = await Promise.all([
    fetchCampaigns(accountId, token),
    fetchAdSets(accountId, token),
    fetchAds(accountId, token),
  ]);

  // Campanhas
  const campaignDbId = new Map<string, string>();
  for (const c of campaigns) {
    const row = await prisma.adCampaign.upsert({
      where: { provider_externalId: { provider: "META", externalId: c.id } },
      create: {
        clientId,
        provider: "META",
        accountId,
        externalId: c.id,
        name: c.name,
        status: c.status ?? null,
        objective: c.objective ?? null,
        dailyBudget: Number(c.daily_budget ?? 0) / 100, // Meta manda em centavos
      },
      update: {
        clientId,
        accountId,
        name: c.name,
        status: c.status ?? null,
        objective: c.objective ?? null,
        dailyBudget: Number(c.daily_budget ?? 0) / 100,
      },
    });
    campaignDbId.set(c.id, row.id);
    result.campaignsSynced++;
  }

  // Conjuntos
  const adSetDbId = new Map<string, string>();
  for (const s of adSets) {
    const campId = campaignDbId.get(s.campaign_id);
    if (!campId) continue;
    const row = await prisma.adSet.upsert({
      where: { externalId: s.id },
      create: {
        campaignId: campId,
        externalId: s.id,
        name: s.name,
        status: s.status ?? null,
        budget: Number(s.daily_budget ?? 0) / 100,
        audience: audienceSummary(s.targeting),
      },
      update: {
        campaignId: campId,
        name: s.name,
        status: s.status ?? null,
        budget: Number(s.daily_budget ?? 0) / 100,
        audience: audienceSummary(s.targeting),
      },
    });
    adSetDbId.set(s.id, row.id);
  }

  // Anúncios (criativos)
  for (const a of ads) {
    const setId = adSetDbId.get(a.adset_id);
    if (!setId) continue;
    await prisma.ad.upsert({
      where: { externalId: a.id },
      create: {
        adSetId: setId,
        externalId: a.id,
        name: a.name,
        status: a.status ?? null,
        creativeTitle: a.creative?.title ?? null,
        creativeBody: a.creative?.body ?? null,
        thumbnailUrl: a.creative?.thumbnail_url ?? null,
      },
      update: {
        adSetId: setId,
        name: a.name,
        status: a.status ?? null,
        creativeTitle: a.creative?.title ?? null,
        creativeBody: a.creative?.body ?? null,
        thumbnailUrl: a.creative?.thumbnail_url ?? null,
      },
    });
  }

  // Métricas diárias: 30 dias na primeira sincronização, 3 dias nas seguintes
  const hasInsights = await prisma.adInsight.findFirst({
    where: { campaign: { clientId, provider: "META", accountId } },
    select: { id: true },
  });
  const today = day0(new Date());
  const since = new Date(today.getTime() - (hasInsights ? 3 : 30) * 86400000);
  const insights = await fetchDailyInsights(accountId, token, iso(since), iso(today));

  // Consolidação diária para o MetricSnapshot (dashboards por canal)
  const daily = new Map<string, { impressions: number; clicks: number; reach: number; spend: number; leads: number; conversions: number }>();

  for (const row of insights) {
    const campId = campaignDbId.get(row.campaign_id);
    if (!campId || !row.date_start) continue;
    const date = day0(new Date(`${row.date_start}T00:00:00`));
    const { leads, conversions } = extractActions(row.actions);
    const data = {
      impressions: Number(row.impressions ?? 0),
      reach: Number(row.reach ?? 0),
      clicks: Number(row.clicks ?? 0),
      linkClicks: Number(row.inline_link_clicks ?? 0),
      spend: Number(row.spend ?? 0),
      frequency: Number(row.frequency ?? 0),
      leads,
      conversions,
    };
    await prisma.adInsight.upsert({
      where: { campaignId_date: { campaignId: campId, date } },
      create: { campaignId: campId, date, ...data },
      update: data,
    });
    result.insightsUpserted++;

    const key = row.date_start;
    const agg = daily.get(key) ?? { impressions: 0, clicks: 0, reach: 0, spend: 0, leads: 0, conversions: 0 };
    agg.impressions += data.impressions;
    agg.clicks += data.clicks;
    agg.reach += data.reach;
    agg.spend += data.spend;
    agg.leads += leads;
    agg.conversions += conversions;
    daily.set(key, agg);
  }

  for (const [dayKey, agg] of daily) {
    const date = day0(new Date(`${dayKey}T00:00:00`));
    await prisma.metricSnapshot.upsert({
      where: { clientId_channel_date: { clientId, channel: "META_ADS", date } },
      create: { clientId, channel: "META_ADS", date, ...agg },
      update: agg,
    });
  }
}

/** Última sincronização Meta concluída (para cache/staleness). */
export async function lastSync(scope = "all"): Promise<Date | null> {
  const log = await prisma.syncLog.findFirst({
    where: { provider: "META", scope, status: { in: ["OK", "PARCIAL"] } },
    orderBy: { startedAt: "desc" },
    select: { finishedAt: true, startedAt: true },
  });
  return log?.finishedAt ?? log?.startedAt ?? null;
}

export function isStale(last: Date | null): boolean {
  return !last || Date.now() - last.getTime() > STALE_MINUTES * 60000;
}

/**
 * Roda a sincronização (todos os clientes ou um específico).
 * Com onlyIfStale, sai cedo se a última execução for recente (cache).
 */
export async function runSync(options: { clientId?: string; onlyIfStale?: boolean } = {}): Promise<SyncResult> {
  const scope = options.clientId ?? "all";
  const result: SyncResult = { clientsProcessed: 0, campaignsSynced: 0, insightsUpserted: 0, errors: 0, details: [] };

  if (options.onlyIfStale && !isStale(await lastSync(scope))) {
    result.details.push("Dados recentes — sincronização pulada (cache).");
    return result;
  }

  const log = await prisma.syncLog.create({ data: { provider: "META", scope, status: "OK" } });

  const [clients, integration] = await Promise.all([
    prisma.client.findMany({
      where: {
        archivedAt: null,
        status: { in: ["ATIVO", "ONBOARDING"] },
        ...(options.clientId ? { id: options.clientId } : {}),
      },
    }),
    prisma.integration.findUnique({ where: { provider: "meta_ads" } }),
  ]);
  const token = integration?.connected
    ? decryptSecret((integration.config as { apiKey?: string } | null)?.apiKey)
    : null;

  for (const client of clients) {
    const accounts = (client.adAccounts as AdAccounts) ?? {};
    if (!accounts.metaAdsId) continue;
    result.clientsProcessed++;

    if (!token) {
      result.details.push(`${client.companyName}: Meta Ads vinculado, mas a integração não está conectada.`);
      result.errors++;
      continue;
    }

    // Aceita várias contas separadas por vírgula
    for (const accountId of accounts.metaAdsId.split(",").map((s) => s.trim()).filter(Boolean)) {
      try {
        await syncMetaAccount(client.id, accountId, token, result);
        result.details.push(`${client.companyName} (${accountId}): sincronizado.`);
      } catch (e) {
        result.errors++;
        result.details.push(`${client.companyName} (${accountId}): ${(e as Error).message}`);
      }
    }

    if (accounts.googleAdsId) {
      result.details.push(`${client.companyName}: Google Ads vinculado — aguardando developer token/OAuth.`);
    }
  }

  await prisma.syncLog.update({
    where: { id: log.id },
    data: {
      status: result.errors === 0 ? "OK" : result.campaignsSynced > 0 ? "PARCIAL" : "ERRO",
      message: result.details.slice(0, 12).join(" | ").slice(0, 900) || null,
      items: result.insightsUpserted,
      finishedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: { action: "sync.run", entity: "AdInsight", entityId: `${result.insightsUpserted} métricas` },
  });

  return result;
}
