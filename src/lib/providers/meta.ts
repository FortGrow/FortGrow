/**
 * Adaptador Meta Ads (Graph API v19) — busca campanhas, conjuntos, anúncios e
 * métricas diárias de uma conta (act_...). Paginação automática e timeout.
 *
 * A URL base pode ser sobrescrita via META_GRAPH_URL (usado nos testes).
 */

const GRAPH = () => process.env.META_GRAPH_URL ?? "https://graph.facebook.com/v19.0";

export type MetaCampaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
};
export type MetaAdSet = {
  id: string;
  campaign_id: string;
  name: string;
  status?: string;
  daily_budget?: string;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: { cities?: { name: string }[]; regions?: { name: string }[]; countries?: string[] };
  };
};
export type MetaAd = {
  id: string;
  adset_id: string;
  name: string;
  status?: string;
  creative?: { title?: string; body?: string; thumbnail_url?: string };
};
export type MetaInsight = {
  campaign_id: string;
  date_start: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  spend?: string;
  frequency?: string;
  actions?: { action_type: string; value: string }[];
};

async function graphGet<T>(path: string, params: Record<string, string>, token: string): Promise<T[]> {
  const out: T[] = [];
  let url = `${GRAPH()}/${path}?${new URLSearchParams({ ...params, limit: "200", access_token: token })}`;
  for (let page = 0; page < 10 && url; page++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const json = (await res.json().catch(() => null)) as { data?: T[]; paging?: { next?: string }; error?: { message?: string } } | null;
    if (!res.ok || !json) throw new Error(json?.error?.message ?? `Meta API HTTP ${res.status}`);
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? "";
  }
  return out;
}

const act = (accountId: string) => `act_${accountId.replace(/^act_/, "")}`;

export async function fetchCampaigns(accountId: string, token: string): Promise<MetaCampaign[]> {
  return graphGet<MetaCampaign>(`${act(accountId)}/campaigns`, { fields: "id,name,status,objective,daily_budget" }, token);
}

export async function fetchAdSets(accountId: string, token: string): Promise<MetaAdSet[]> {
  return graphGet<MetaAdSet>(
    `${act(accountId)}/adsets`,
    { fields: "id,name,status,campaign_id,daily_budget,targeting" },
    token
  );
}

export async function fetchAds(accountId: string, token: string): Promise<MetaAd[]> {
  return graphGet<MetaAd>(
    `${act(accountId)}/ads`,
    { fields: "id,name,status,adset_id,creative{title,body,thumbnail_url}" },
    token
  );
}

/** Métricas diárias por campanha no intervalo [since, until] (YYYY-MM-DD). */
export async function fetchDailyInsights(
  accountId: string,
  token: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  return graphGet<MetaInsight>(
    `${act(accountId)}/insights`,
    {
      level: "campaign",
      time_increment: "1",
      fields: "campaign_id,impressions,reach,clicks,inline_link_clicks,spend,frequency,actions",
      time_range: JSON.stringify({ since, until }),
    },
    token
  );
}

/** Resumo legível do público de um conjunto (targeting). */
export function audienceSummary(t?: MetaAdSet["targeting"]): string | null {
  if (!t) return null;
  const parts: string[] = [];
  if (t.age_min || t.age_max) parts.push(`${t.age_min ?? "?"}–${t.age_max ?? "?"} anos`);
  if (t.genders?.length === 1) parts.push(t.genders[0] === 1 ? "homens" : "mulheres");
  const places = [
    ...(t.geo_locations?.cities?.map((c) => c.name) ?? []),
    ...(t.geo_locations?.regions?.map((r) => r.name) ?? []),
    ...(t.geo_locations?.countries ?? []),
  ];
  if (places.length) parts.push(places.slice(0, 3).join(", "));
  return parts.length ? parts.join(" · ") : null;
}

/** Extrai leads e conversões do array de actions do insight. */
export function extractActions(actions?: { action_type: string; value: string }[]): {
  leads: number;
  conversions: number;
} {
  const list = actions ?? [];
  const val = (types: string[]) =>
    list.filter((a) => types.includes(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);
  return {
    leads: val(["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]),
    conversions: val(["purchase", "offsite_conversion.fb_pixel_purchase", "onsite_conversion.purchase"]),
  };
}
