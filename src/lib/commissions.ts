/**
 * Cálculo automático das comissões de colaboradores.
 *
 * Regras:
 *  - PERCENTUAL: % sobre a receita PAGA do cliente no mês (faturas pagas).
 *  - FIXO: valor fixo mensal por cliente atendido (independe da receita).
 * Lucro restante do cliente = receita do mês − soma das comissões do mês.
 */
import { prisma } from "@/lib/prisma";

export type CommissionRow = {
  clientId: string;
  clientName: string;
  revenue: number;
  type: string; // PERCENTUAL | FIXO
  value: number;
  commission: number;
};

export type CollaboratorReport = {
  userId: string;
  userName: string;
  rows: CommissionRow[];
  monthTotal: number;
  yearTotal: number;
};

export type CommissionSummary = {
  collaborators: CollaboratorReport[];
  monthTotal: number;
  yearTotal: number;
  /// Por cliente no mês: receita, comissões e lucro restante
  clients: { clientId: string; clientName: string; revenue: number; commission: number; profit: number }[];
  /// Total de comissão por mês do ano (1–12), para gráficos
  byMonth: number[];
};

function monthOf(inv: { paidAt: Date | null; dueDate: Date }) {
  return (inv.paidAt ?? inv.dueDate).getMonth();
}

export async function commissionReport(year: number, month: number): Promise<CommissionSummary> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [invoices, assignments] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "PAGO", OR: [{ paidAt: { gte: start, lt: end } }, { paidAt: null, dueDate: { gte: start, lt: end } }] },
      select: { clientId: true, amount: true, paidAt: true, dueDate: true },
    }),
    prisma.staffCommission.findMany({
      include: {
        client: { select: { id: true, companyName: true, status: true } },
        user: { select: { id: true, name: true } },
      },
    }),
  ]);

  // receita[clientId][mes 0-11]
  const revenue = new Map<string, number[]>();
  for (const inv of invoices) {
    const arr = revenue.get(inv.clientId) ?? Array(12).fill(0);
    arr[monthOf(inv)] += Number(inv.amount);
    revenue.set(inv.clientId, arr);
  }

  const commissionFor = (a: (typeof assignments)[number], m: number) => {
    const rev = revenue.get(a.clientId)?.[m] ?? 0;
    if (a.type === "PERCENTUAL") return rev * (Number(a.value) / 100);
    // FIXO: devido mensalmente enquanto o cliente estiver ativo
    return a.client.status === "INATIVO" ? 0 : Number(a.value);
  };

  const byUser = new Map<string, CollaboratorReport>();
  const byClientMonth = new Map<string, { clientName: string; revenue: number; commission: number }>();
  const byMonth = Array(12).fill(0);
  const m = month - 1;

  for (const a of assignments) {
    let yearTotal = 0;
    for (let i = 0; i < 12; i++) {
      const c = commissionFor(a, i);
      yearTotal += c;
      byMonth[i] += c;
    }
    const monthCommission = commissionFor(a, m);
    const rev = revenue.get(a.clientId)?.[m] ?? 0;

    const rep = byUser.get(a.userId) ?? {
      userId: a.userId,
      userName: a.user.name,
      rows: [],
      monthTotal: 0,
      yearTotal: 0,
    };
    rep.rows.push({
      clientId: a.clientId,
      clientName: a.client.companyName,
      revenue: rev,
      type: a.type,
      value: Number(a.value),
      commission: monthCommission,
    });
    rep.monthTotal += monthCommission;
    rep.yearTotal += yearTotal;
    byUser.set(a.userId, rep);

    const cm = byClientMonth.get(a.clientId) ?? { clientName: a.client.companyName, revenue: rev, commission: 0 };
    cm.commission += monthCommission;
    byClientMonth.set(a.clientId, cm);
  }

  const collaborators = [...byUser.values()].sort((a, b) => b.monthTotal - a.monthTotal);
  return {
    collaborators,
    monthTotal: collaborators.reduce((s, c) => s + c.monthTotal, 0),
    yearTotal: collaborators.reduce((s, c) => s + c.yearTotal, 0),
    clients: [...byClientMonth.entries()].map(([clientId, c]) => ({
      clientId,
      clientName: c.clientName,
      revenue: c.revenue,
      commission: c.commission,
      profit: c.revenue - c.commission,
    })),
    byMonth,
  };
}

/**
 * Custos do período a partir da central de custos:
 *  - mensal recorrente conta em todos os meses;
 *  - anual recorrente conta integral no ano (e /12 na visão mensal);
 *  - única conta no mês/ano da data.
 */
export async function costReport(year: number, month: number) {
  const costs = await prisma.expense.findMany({ where: { status: { not: "CANCELADO" } } });
  const m = month - 1;

  let monthly = 0;
  let yearly = 0;
  const byMonth = Array(12).fill(0);

  for (const c of costs) {
    const amount = Number(c.amount);
    if (c.recurring && c.frequency === "mensal") {
      yearly += amount * 12;
      for (let i = 0; i < 12; i++) byMonth[i] += amount;
      monthly += amount;
    } else if (c.recurring && c.frequency === "anual") {
      yearly += amount;
      byMonth[c.date.getMonth()] += amount;
      monthly += amount / 12;
    } else if (c.date.getFullYear() === year) {
      yearly += amount;
      byMonth[c.date.getMonth()] += amount;
      if (c.date.getMonth() === m) monthly += amount;
    }
  }

  return { monthly, yearly, byMonth };
}
