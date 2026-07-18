import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { invalidResponse } from "@/lib/validation";

const PAYMENT_METHODS = ["PIX", "BOLETO", "CARTAO", "TRANSFERENCIA"] as const;

const createSchema = z.object({
  clientId: z.string().min(1),
  description: z.string().min(2).max(160),
  amount: z.coerce.number().min(0.01),
  dueDate: z.string().min(4),
  method: z.enum(PAYMENT_METHODS).nullish().or(z.literal("")),
});

/** Cria uma cobrança avulsa (fora da recorrência). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { dueDate, method, ...rest } = parsed.data;
  const invoice = await prisma.invoice.create({
    data: { ...rest, dueDate: new Date(dueDate), method: method || null },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "invoice.create", entity: "Invoice", entityId: invoice.id },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  /// PAGO marca paidAt agora; EM_ABERTO reabre (limpa paidAt); ATRASADO/CANCELADO só mudam o status
  status: z.enum(["EM_ABERTO", "PAGO", "ATRASADO", "CANCELADO"]).optional(),
  method: z.enum(PAYMENT_METHODS).nullish().or(z.literal("")),
  amount: z.coerce.number().min(0.01).optional(),
  dueDate: z.string().min(4).optional(),
  description: z.string().min(2).max(160).optional(),
});

/** Atualiza uma cobrança — marcar como paga, reabrir, cancelar ou editar. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, status, method, dueDate, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (status) {
    data.status = status;
    if (status === "PAGO") data.paidAt = new Date();
    if (status === "EM_ABERTO") data.paidAt = null;
  }
  if (method !== undefined) data.method = method || null;
  if (dueDate !== undefined) data.dueDate = new Date(dueDate);

  const invoice = await prisma.invoice.update({ where: { id }, data }).catch(() => null);
  if (!invoice) return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });

  await prisma.activityLog.create({
    data: {
      userId: session.sub,
      action: status === "PAGO" ? "invoice.paid" : "invoice.update",
      entity: "Invoice",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true, invoice });
}

/** Exclui uma cobrança (id via querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("financeiro", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const invoice = await prisma.invoice.delete({ where: { id } }).catch(() => null);
  if (!invoice) return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "invoice.delete", entity: "Invoice", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
