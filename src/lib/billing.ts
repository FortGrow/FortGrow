/**
 * Motor de mensalidades do FortGrow.
 *
 * Uma Mensalidade (Subscription) descreve a recorrência; cada período gera
 * uma cobrança (Invoice) vinculada. A geração é idempotente: nunca cria duas
 * cobranças da mesma mensalidade no mesmo período.
 */
import { prisma } from "@/lib/prisma";

export const FREQUENCIES = {
  MENSAL: { label: "Mensal", months: 1 },
  TRIMESTRAL: { label: "Trimestral", months: 3 },
  ANUAL: { label: "Anual", months: 12 },
} as const;

export type Frequency = keyof typeof FREQUENCIES;

/** Valor mensal equivalente (para MRR). */
export function monthlyEquivalent(amount: number, frequency: string): number {
  const months = FREQUENCIES[frequency as Frequency]?.months ?? 1;
  return amount / months;
}

/** A mensalidade cobra neste mês? (alinhado ao mês de início, pela frequência) */
function chargesInMonth(startDate: Date, frequency: string, year: number, month0: number): boolean {
  const months = FREQUENCIES[frequency as Frequency]?.months ?? 1;
  const diff = (year - startDate.getFullYear()) * 12 + (month0 - startDate.getMonth());
  return diff >= 0 && diff % months === 0;
}

/** Data de vencimento no mês, respeitando meses curtos (dia 31 → último dia). */
function dueDateFor(year: number, month0: number, dueDay: number): Date {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(dueDay, lastDay));
}

/**
 * Gera as cobranças do mês corrente para todas as mensalidades ativas
 * (e da mensalidade específica, se `subscriptionId` for passado).
 * Retorna quantas cobranças foram criadas.
 */
export async function generateSubscriptionCharges(subscriptionId?: string): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month0 = now.getMonth();
  const monthStart = new Date(year, month0, 1);
  const monthEnd = new Date(year, month0 + 1, 1);

  const subs = await prisma.subscription.findMany({
    where: { status: "ATIVA", ...(subscriptionId ? { id: subscriptionId } : {}), client: { archivedAt: null } },
  });

  let created = 0;
  for (const sub of subs) {
    if (!chargesInMonth(sub.startDate, sub.frequency, year, month0)) continue;
    const exists = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id, dueDate: { gte: monthStart, lt: monthEnd } },
      select: { id: true },
    });
    if (exists) continue;
    const label = FREQUENCIES[sub.frequency as Frequency]?.label ?? "Mensal";
    await prisma.invoice.create({
      data: {
        clientId: sub.clientId,
        subscriptionId: sub.id,
        description: `${sub.description} (${label.toLowerCase()}) · ${String(month0 + 1).padStart(2, "0")}/${year}`,
        amount: sub.amount,
        dueDate: dueDateFor(year, month0, sub.dueDay),
        method: sub.paymentMethod,
        status: "EM_ABERTO",
      },
    });
    created++;
  }
  return created;
}

/**
 * MRR da carteira: soma o equivalente mensal das mensalidades ativas;
 * clientes sem nenhuma mensalidade cadastrada (fixos ou por comissão com
 * mensalidade híbrida) entram pelo valor mensal do contrato.
 */
export async function currentMrr(): Promise<{ mrr: number; withSubs: number; legacy: number }> {
  const [subs, legacyClients] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ATIVA", client: { archivedAt: null, status: { in: ["ATIVO", "ONBOARDING"] } } },
      select: { amount: true, frequency: true, clientId: true },
    }),
    prisma.client.findMany({
      where: {
        archivedAt: null,
        status: "ATIVO",
        monthlyValue: { gt: 0 },
        subscriptions: { none: { status: "ATIVA" } },
      },
      select: { monthlyValue: true },
    }),
  ]);
  const fromSubs = subs.reduce((s, x) => s + monthlyEquivalent(Number(x.amount), x.frequency), 0);
  const fromLegacy = legacyClients.reduce((s, c) => s + Number(c.monthlyValue), 0);
  return { mrr: fromSubs + fromLegacy, withSubs: new Set(subs.map((s) => s.clientId)).size, legacy: legacyClients.length };
}
