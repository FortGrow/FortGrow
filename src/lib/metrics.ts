/**
 * Cálculos financeiros e de marketing do FortGrow.
 * Todas as fórmulas centralizadas para consistência entre dashboards.
 */

export type ChannelTotals = {
  impressions: number;
  clicks: number;
  reach: number;
  engagement: number;
  leads: number;
  conversions: number;
  spend: number;
  revenue: number;
  followers: number;
};

export function emptyTotals(): ChannelTotals {
  return {
    impressions: 0,
    clicks: 0,
    reach: 0,
    engagement: 0,
    leads: 0,
    conversions: 0,
    spend: 0,
    revenue: 0,
    followers: 0,
  };
}

export function sumTotals(rows: Partial<ChannelTotals>[]): ChannelTotals {
  const t = emptyTotals();
  for (const r of rows) {
    t.impressions += Number(r.impressions ?? 0);
    t.clicks += Number(r.clicks ?? 0);
    t.reach += Number(r.reach ?? 0);
    t.engagement += Number(r.engagement ?? 0);
    t.leads += Number(r.leads ?? 0);
    t.conversions += Number(r.conversions ?? 0);
    t.spend += Number(r.spend ?? 0);
    t.revenue += Number(r.revenue ?? 0);
    t.followers = Math.max(t.followers, Number(r.followers ?? 0));
  }
  return t;
}

const safe = (a: number, b: number) => (b > 0 ? a / b : 0);

export const kpis = {
  ctr: (t: ChannelTotals) => safe(t.clicks, t.impressions) * 100,
  cpc: (t: ChannelTotals) => safe(t.spend, t.clicks),
  cpm: (t: ChannelTotals) => safe(t.spend, t.impressions) * 1000,
  cpl: (t: ChannelTotals) => safe(t.spend, t.leads),
  cpa: (t: ChannelTotals) => safe(t.spend, t.conversions),
  cac: (t: ChannelTotals) => safe(t.spend, t.conversions),
  roas: (t: ChannelTotals) => safe(t.revenue, t.spend),
  roi: (t: ChannelTotals) => safe(t.revenue - t.spend, t.spend) * 100,
  convRate: (t: ChannelTotals) => safe(t.conversions, t.leads) * 100,
  /** Valor por lead = receita gerada / leads captados. */
  // Valor por lead = valor gasto / leads gerados (regra definida pelo cliente)
  valuePerLead: (t: ChannelTotals) => safe(t.spend, t.leads),
  /** Ticket médio = receita / conversões (vendas). */
  avgTicket: (t: ChannelTotals) => safe(t.revenue, t.conversions),
  /** Custo por venda = investimento / conversões (mesmo que CPA). */
  costPerSale: (t: ChannelTotals) => safe(t.spend, t.conversions),
};

/** LTV = ticket médio mensal × tempo médio de contrato (meses). */
export function ltv(avgMonthly: number, avgMonths: number) {
  return avgMonthly * avgMonths;
}

/** Payback em meses = CAC / margem mensal por cliente. */
export function paybackMonths(cac: number, monthlyMargin: number) {
  return monthlyMargin > 0 ? cac / monthlyMargin : 0;
}

/** Churn % = clientes perdidos / clientes no início do período. */
export function churnRate(lost: number, total: number) {
  return total > 0 ? (lost / total) * 100 : 0;
}
