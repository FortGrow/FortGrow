/**
 * Sincronização automática de campanhas por cliente.
 *
 * Para cada cliente ativo com conta de anúncio vinculada (ficha do cliente →
 * Integrações de campanha) e com a integração conectada (Integrações → token),
 * busca as métricas do dia anterior e grava em MetricSnapshot — alimentando
 * automaticamente os dashboards do cliente.
 *
 * Adaptadores:
 *  - Meta Ads: implementado via Graph API (insights) — funciona com um token
 *    válido do WhatsApp Business/Meta for Developers.
 *  - Google Ads: requer developer token aprovado + OAuth; o adaptador registra
 *    a pendência até as credenciais completas serem configuradas.
 */
import { prisma } from "@/lib/prisma";

type AdAccounts = { googleAdsId?: string; metaAdsId?: string; instagram?: string; ga4PropertyId?: string };

export type SyncResult = {
  clientsProcessed: number;
  snapshotsUpserted: number;
  details: string[];
};

async function syncMetaAds(
  clientId: string,
  accountId: string,
  accessToken: string,
  date: Date
): Promise<{ ok: boolean; message: string }> {
  const day = date.toISOString().slice(0, 10);
  const url =
    `https://graph.facebook.com/v19.0/act_${accountId.replace(/^act_/, "")}/insights` +
    `?fields=impressions,clicks,reach,spend,actions&time_range={"since":"${day}","until":"${day}"}` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return { ok: false, message: `Meta Ads: ${json?.error?.message ?? `HTTP ${res.status}`}` };
    }

    const row = json.data?.[0];
    if (!row) return { ok: true, message: "Meta Ads: sem dados no período." };

    const actions: { action_type: string; value: string }[] = row.actions ?? [];
    const leads = Number(actions.find((a) => a.action_type === "lead")?.value ?? 0);
    const conversions = Number(
      actions.find((a) => ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(a.action_type))?.value ?? 0
    );

    await prisma.metricSnapshot.upsert({
      where: { clientId_channel_date: { clientId, channel: "META_ADS", date } },
      create: {
        clientId,
        channel: "META_ADS",
        date,
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        reach: Number(row.reach ?? 0),
        spend: Number(row.spend ?? 0),
        leads,
        conversions,
      },
      update: {
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        reach: Number(row.reach ?? 0),
        spend: Number(row.spend ?? 0),
        leads,
        conversions,
      },
    });
    return { ok: true, message: "Meta Ads: sincronizado." };
  } catch (e) {
    return { ok: false, message: `Meta Ads: falha de conexão (${(e as Error).message}).` };
  }
}

export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = { clientsProcessed: 0, snapshotsUpserted: 0, details: [] };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const [clients, integrations] = await Promise.all([
    prisma.client.findMany({ where: { status: { in: ["ATIVO", "ONBOARDING"] } } }),
    prisma.integration.findMany({ where: { connected: true } }),
  ]);
  const tokenOf = (provider: string) =>
    (integrations.find((i) => i.provider === provider)?.config as { apiKey?: string } | null)?.apiKey;

  for (const client of clients) {
    const accounts = (client.adAccounts as AdAccounts) ?? {};
    let touched = false;

    if (accounts.metaAdsId) {
      const token = tokenOf("meta_ads");
      if (!token) {
        result.details.push(`${client.companyName}: Meta Ads vinculado, mas a integração não está conectada.`);
      } else {
        const r = await syncMetaAds(client.id, accounts.metaAdsId, token, yesterday);
        result.details.push(`${client.companyName}: ${r.message}`);
        if (r.ok) {
          result.snapshotsUpserted++;
          touched = true;
        }
      }
    }

    if (accounts.googleAdsId) {
      result.details.push(
        `${client.companyName}: Google Ads vinculado — aguardando developer token/OAuth para sincronizar.`
      );
    }

    if (touched || accounts.metaAdsId || accounts.googleAdsId) result.clientsProcessed++;
  }

  await prisma.activityLog.create({
    data: { action: "sync.run", entity: "MetricSnapshot", entityId: `${result.snapshotsUpserted} snapshots` },
  });

  return result;
}
