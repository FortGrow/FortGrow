import { prisma } from "./prisma";

/**
 * Serialização compartilhada do módulo de Performance (rotas de lançamentos
 * e de vendas detalhadas), com Decimals convertidos e datas em yyyy-mm-dd.
 */

export const ENTRY_INCLUDE = { salesDetails: { orderBy: { createdAt: "asc" as const } } };

type SaleRecord = {
  id: string;
  sellerName: string;
  buyer: string | null;
  amount: unknown;
  notes: string | null;
};

export function serializeSale(s: SaleRecord) {
  return { id: s.id, sellerName: s.sellerName, buyer: s.buyer, amount: Number(s.amount), notes: s.notes };
}

export function serializeEntry(e: {
  id: string;
  date: Date;
  investment: unknown;
  leads: number;
  sales: number;
  revenue: unknown;
  convPercent: unknown;
  commissionPercent: unknown;
  source: string;
  campaign: string | null;
  campaignType: string | null;
  views: number;
  clicks: number;
  reach: number;
  interactions: number;
  salesDetails?: SaleRecord[];
}) {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    investment: Number(e.investment),
    leads: e.leads,
    sales: e.sales,
    revenue: Number(e.revenue),
    convPercent: e.convPercent == null ? null : Number(e.convPercent),
    commissionPercent: e.commissionPercent == null ? null : Number(e.commissionPercent),
    source: e.source,
    campaign: e.campaign,
    campaignType: e.campaignType,
    views: e.views,
    clicks: e.clicks,
    reach: e.reach,
    interactions: e.interactions,
    salesDetails: (e.salesDetails ?? []).map(serializeSale),
  };
}

/**
 * Sincroniza a linha com os detalhes de venda: com 1+ detalhes, Vendas e
 * Receita bruta passam a ser a contagem e a soma deles; sem detalhes, os
 * valores digitados manualmente ficam como estão.
 */
export async function syncEntryFromSales(entryId: string) {
  const details = await prisma.performanceSale.findMany({ where: { entryId } });
  if (details.length > 0) {
    return prisma.performanceEntry.update({
      where: { id: entryId },
      data: { sales: details.length, revenue: details.reduce((s, d) => s + Number(d.amount), 0) },
      include: ENTRY_INCLUDE,
    });
  }
  return prisma.performanceEntry.findUnique({ where: { id: entryId }, include: ENTRY_INCLUDE });
}
