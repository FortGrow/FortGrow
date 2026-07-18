import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

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

  const { clientId, salesVolume, basePercent, sharePercent, reference, dueDate } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  if (client.billingType !== "COMISSAO") {
    return NextResponse.json({ error: "Este cliente não tem contrato por comissão." }, { status: 400 });
  }

  const clientCommission = salesVolume * (basePercent / 100);
  const amount = Math.round(clientCommission * (sharePercent / 100) * 100) / 100;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      description: `Comissão ${reference} — ${fmt(salesVolume)} vendidos × ${basePercent}% × ${sharePercent}%`,
      amount,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 86400000),
      status: "EM_ABERTO",
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "commission.launch", entity: "Invoice", entityId: invoice.id },
  });

  return NextResponse.json({ invoice, amount, clientCommission }, { status: 201 });
}
