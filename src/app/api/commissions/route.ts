import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { closingPeriod, periodoLabel } from "@/lib/closing-period";

export const dynamic = "force-dynamic";

/**
 * Volume vendido por um cliente no período de apuração.
 *
 * Soma a receita bruta dos lançamentos de Performance entre `from` e `to`
 * (inclusivos) — as vendas já registradas no dashboard do cliente. É o que
 * pré-preenche o lançamento de comissão, no lugar do número digitado de
 * cabeça: sem período certo não existe cálculo preciso.
 */
export async function GET(req: NextRequest) {
  const session = await requireStaff("financeiro", "view");
  if (isResponse(session)) return session;

  const p = req.nextUrl.searchParams;
  const clientId = p.get("clientId") ?? "";
  const year = Number(p.get("year"));
  const month = Number(p.get("month"));

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { closingDay: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  // Período: o informado (de/até) ou o derivado do dia de fechamento
  let from = p.get("from") ? new Date(`${p.get("from")}T00:00:00`) : null;
  let to = p.get("to") ? new Date(`${p.get("to")}T23:59:59`) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    if (!year || !month) return NextResponse.json({ error: "Informe a competência ou o período." }, { status: 400 });
    const periodo = closingPeriod(year, month, client.closingDay);
    from = new Date(periodo.from.getFullYear(), periodo.from.getMonth(), periodo.from.getDate());
    to = new Date(periodo.to.getFullYear(), periodo.to.getMonth(), periodo.to.getDate(), 23, 59, 59);
  }

  const agregado = await prisma.performanceEntry.aggregate({
    where: { clientId, date: { gte: from, lte: to } },
    _sum: { revenue: true, sales: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    closingDay: client.closingDay,
    volume: Number(agregado._sum.revenue ?? 0),
    vendas: agregado._sum.sales ?? 0,
    lancamentos: agregado._count._all,
  });
}

const schema = z.object({
  clientId: z.string().min(1),
  /// Volume vendido pelo cliente no período (ex.: 1.000.000)
  salesVolume: z.coerce.number().positive(),
  /// % de comissão do cliente sobre o volume (ex.: 3 ou 1.5) — prefixado do cadastro, editável por lançamento
  basePercent: z.coerce.number().positive().max(100),
  /// % da FortGrow sobre a comissão do cliente (ex.: 10)
  sharePercent: z.coerce.number().positive().max(100),
  /// Competência do lançamento, ex.: "julho/2026"
  reference: z.string().min(2).max(40),
  dueDate: z.string().optional(),
  /// Período de vendas apurado (inclusivo) — fica gravado na fatura
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Lança o faturamento de um cliente com contrato por comissão.
 * Valor da FortGrow = volume × base% × repasse%.
 * Ex.: R$ 1.000.000 × 3% × 10% = R$ 3.000 (parcela 100%)
 *      R$ 1.000.000 × 1,5% × 10% = R$ 1.500 (parcela fechada em 50%)
 * Gera uma fatura EM_ABERTO que alimenta todos os dashboards financeiros.
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { clientId, salesVolume, basePercent, sharePercent, reference, dueDate, periodStart, periodEnd } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  if (client.billingType !== "COMISSAO") {
    return NextResponse.json({ error: "Este cliente não tem contrato por comissão." }, { status: 400 });
  }

  const clientCommission = salesVolume * (basePercent / 100);
  const amount = Math.round(clientCommission * (sharePercent / 100) * 100) / 100;

  const inicio = periodStart ? new Date(`${periodStart}T12:00:00`) : null;
  const fim = periodEnd ? new Date(`${periodEnd}T12:00:00`) : null;
  if (inicio && fim && inicio > fim) {
    return NextResponse.json({ error: "O início do período não pode ser depois do fim." }, { status: 400 });
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const janela = inicio && fim ? ` · vendas de ${periodoLabel({ from: inicio, to: fim })}` : "";
  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      description: `Comissão ${reference}${janela} — ${fmt(salesVolume)} vendidos × ${basePercent}% × ${sharePercent}%`,
      amount,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 86400000),
      status: "EM_ABERTO",
      periodStart: inicio,
      periodEnd: fim,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "commission.launch", entity: "Invoice", entityId: invoice.id },
  });

  return NextResponse.json({ invoice, amount, clientCommission }, { status: 201 });
}

const patchSchema = z.object({
  invoiceId: z.string().min(1),
  salesVolume: z.coerce.number().positive(),
  basePercent: z.coerce.number().positive().max(100),
  sharePercent: z.coerce.number().positive().max(100),
  reference: z.string().min(2).max(40),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Corrige um lançamento de comissão já feito: recalcula o valor a partir do
 * volume vendido e das porcentagens e atualiza a cobrança (mesmo se paga).
 */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { invoiceId, salesVolume, basePercent, sharePercent, reference, periodStart, periodEnd } = parsed.data;
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!existing) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const clientCommission = salesVolume * (basePercent / 100);
  const amount = Math.round(clientCommission * (sharePercent / 100) * 100) / 100;

  const inicio = periodStart ? new Date(`${periodStart}T12:00:00`) : existing.periodStart;
  const fim = periodEnd ? new Date(`${periodEnd}T12:00:00`) : existing.periodEnd;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const janela = inicio && fim ? ` · vendas de ${periodoLabel({ from: inicio, to: fim })}` : "";
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      description: `Comissão ${reference}${janela} — ${fmt(salesVolume)} vendidos × ${basePercent}% × ${sharePercent}%`,
      amount,
      periodStart: inicio,
      periodEnd: fim,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "commission.launch_update", entity: "Invoice", entityId: invoiceId },
  });

  return NextResponse.json({ ok: true, invoice, amount, clientCommission });
}
