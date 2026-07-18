import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { emptyToNull, invalidResponse } from "@/lib/validation";
import { generateSubscriptionCharges } from "@/lib/billing";

const PAYMENT_METHODS = ["PIX", "BOLETO", "CARTAO", "TRANSFERENCIA"] as const;

const createSchema = z.object({
  clientId: z.string().min(1),
  description: z.string().min(2).max(120).default("Mensalidade"),
  amount: z.coerce.number().min(0.01),
  frequency: z.enum(["MENSAL", "TRIMESTRAL", "ANUAL"]).default("MENSAL"),
  startDate: z.string().min(4),
  dueDay: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(31).nullish()),
  paymentMethod: z.enum(PAYMENT_METHODS).nullish().or(z.literal("")),
  notes: z.string().max(1000).nullish(),
});

/** Cria uma mensalidade e já gera a cobrança do período atual (se couber). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { clientId, startDate, dueDay, paymentMethod, notes, ...rest } = parsed.data;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, archivedAt: true } });
  if (!client || client.archivedAt) {
    return NextResponse.json({ error: "Cliente não encontrado (ou na Lixeira)." }, { status: 404 });
  }

  const subscription = await prisma.subscription.create({
    data: {
      clientId,
      ...rest,
      startDate: new Date(startDate),
      dueDay: dueDay ?? 5,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
    },
  });

  const charges = await generateSubscriptionCharges(subscription.id);

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "subscription.create", entity: "Subscription", entityId: subscription.id },
  });

  return NextResponse.json({ subscription, chargesCreated: charges }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(2).max(120).optional(),
  amount: z.coerce.number().min(0.01).optional(),
  frequency: z.enum(["MENSAL", "TRIMESTRAL", "ANUAL"]).optional(),
  startDate: z.string().min(4).optional(),
  dueDay: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(31).nullish()),
  paymentMethod: z.enum(PAYMENT_METHODS).nullish().or(z.literal("")),
  notes: z.string().max(1000).nullish(),
  status: z.enum(["ATIVA", "PAUSADA", "CANCELADA"]).optional(),
});

/** Edita uma mensalidade (valores novos valem para as próximas cobranças). */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, startDate, dueDay, paymentMethod, notes, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (dueDay !== undefined && dueDay !== null) data.dueDay = dueDay;
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod || null;
  if (notes !== undefined) data.notes = notes || null;

  const subscription = await prisma.subscription.update({ where: { id }, data }).catch(() => null);
  if (!subscription) return NextResponse.json({ error: "Mensalidade não encontrada." }, { status: 404 });

  // Reativou? Garante a cobrança do período atual.
  if (rest.status === "ATIVA") await generateSubscriptionCharges(id);

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "subscription.update", entity: "Subscription", entityId: id },
  });

  return NextResponse.json({ ok: true, subscription });
}

/** Exclui a mensalidade (id via querystring). O histórico de cobranças fica. */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("financeiro", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const sub = await prisma.subscription.delete({ where: { id } }).catch(() => null);
  if (!sub) return NextResponse.json({ error: "Mensalidade não encontrada." }, { status: 404 });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "subscription.delete", entity: "Subscription", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
