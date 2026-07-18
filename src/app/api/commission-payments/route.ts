import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { MONTHS_PT } from "@/lib/period";

const schema = z.object({
  userName: z.string().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  amount: z.coerce.number().positive(),
});

/**
 * Registra o pagamento da comissão de um colaborador no mês.
 * Vira um custo (categoria "comissoes"), alimentando a Central de Custos e o
 * histórico de pagamentos automaticamente.
 */
export async function POST(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { userName, year, month, amount } = parsed.data;
  const description = `Comissão ${userName} — ${MONTHS_PT[month - 1]}/${year}`;

  const dup = await prisma.expense.findFirst({ where: { description, category: "comissoes" } });
  if (dup) {
    return NextResponse.json({ error: "Pagamento desta competência já registrado." }, { status: 409 });
  }

  const expense = await prisma.expense.create({
    data: {
      description,
      category: "comissoes",
      amount,
      date: new Date(),
      recurring: false,
      frequency: "unica",
      status: "PAGO",
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "commission_payment", entity: "Expense", entityId: expense.id },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
