import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  description: z.string().min(2).max(160),
  category: z.string().min(2).max(40),
  amount: z.coerce.number().positive(),
  recurring: z.coerce.boolean().optional(),
  frequency: z.enum(["mensal", "anual", "unica"]).optional(),
  date: z.string().min(8),
  status: z.enum(["ATIVO", "PAGO", "CANCELADO"]).optional(),
  notes: z.string().max(500).optional(),
});

/** Cadastra um custo na central de custos. */
export async function POST(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { date, recurring, frequency, ...rest } = parsed.data;
  const expense = await prisma.expense.create({
    data: {
      ...rest,
      date: new Date(date),
      recurring: recurring ?? false,
      frequency: recurring ? frequency ?? "mensal" : "unica",
      status: parsed.data.status ?? "ATIVO",
      notes: parsed.data.notes || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "cost.create", entity: "Expense", entityId: expense.id },
  });

  return NextResponse.json({ expense }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ATIVO", "PAGO", "CANCELADO"]),
});

/** Atualiza o status de um custo. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const expense = await prisma.expense.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ expense });
}

/** Remove um custo (id pela querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("financeiro", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.expense.delete({ where: { id } }).catch(() => null);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "cost.delete", entity: "Expense", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
