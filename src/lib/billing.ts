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

  const subs = await prisma.subscription.findMany({
    where: { status: "ATIVA", ...(subscriptionId ? { id: subscriptionId } : {}), client: { archivedAt: null } },
  });

  let created = 0;
  for (const sub of subs) {
    /* Interruptor por mensalidade: só replica quem está marcado como parte
       FIXA do contrato (autoGenerate). Em cliente variável a mensalidade
       nasce desligada — a comissão sai do Lançar comissão, calculada das
       vendas do período; o que foi gerado no período anterior não
       representa o resultado atual. */
    if (!sub.autoGenerate) continue;

    /* Rotina geral: só o mês corrente. Ao criar/editar UMA mensalidade
       (subscriptionId presente), gera também os meses desde o início dela
       (até 12 para trás): cadastrar em agosto uma mensalidade que começou
       em julho cria a cobrança de julho na hora. */
    const inicioSub = new Date(sub.startDate.getFullYear(), sub.startDate.getMonth(), 1);
    const piso = new Date(year, month0 - 11, 1);
    const primeiro = subscriptionId
      ? new Date(Math.max(inicioSub.getTime(), piso.getTime()))
      : monthStart;

    for (let cursor = new Date(primeiro); cursor <= monthStart; cursor.setMonth(cursor.getMonth() + 1)) {
      const cy = cursor.getFullYear();
      const cm = cursor.getMonth();
      if (!chargesInMonth(sub.startDate, sub.frequency, cy, cm)) continue;
      const exists = await prisma.invoice.findFirst({
        where: { subscriptionId: sub.id, dueDate: { gte: new Date(cy, cm, 1), lt: new Date(cy, cm + 1, 1) } },
        select: { id: true },
      });
      if (exists) continue;
      const label = FREQUENCIES[sub.frequency as Frequency]?.label ?? "Mensal";
      await prisma.invoice.create({
        data: {
          clientId: sub.clientId,
          subscriptionId: sub.id,
          description: `${sub.description} (${label.toLowerCase()}) · ${String(cm + 1).padStart(2, "0")}/${cy}`,
          amount: sub.amount,
          dueDate: dueDateFor(cy, cm, sub.dueDay),
          method: sub.paymentMethod,
          status: "EM_ABERTO",
        },
      });
      created++;
    }
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
