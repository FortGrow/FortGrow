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
  /// Data REAL do pagamento (editável): quem paga em 31/07 e é marcado em
  /// agosto precisa contar no mês certo do faturamento
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  /// Competência: em que mês/ano esta cobrança conta no Faturamento
  /// (ex.: "2026-07"). Reescreve a marca "· MM/AAAA" da descrição e grava
  /// o período — tem prioridade sobre data de pagamento e vencimento.
  competencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  description: z.string().min(2).max(160).optional(),
});

/** Atualiza uma cobrança — marcar como paga, reabrir, cancelar ou editar. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("financeiro", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, status, method, dueDate, paidAt, competencia, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (status) {
    data.status = status;
    if (status === "PAGO") data.paidAt = new Date();
    if (status === "EM_ABERTO") data.paidAt = null;
  }
  if (method !== undefined) data.method = method || null;
  if (dueDate !== undefined) data.dueDate = new Date(dueDate);
  // Data explícita de pagamento vence o carimbo automático do clique
  if (paidAt !== undefined) data.paidAt = paidAt ? new Date(`${paidAt}T12:00:00`) : null;

  if (competencia) {
    const [ano, mes] = competencia.split("-").map(Number);
    // O período gravado é o que o Faturamento olha primeiro — decide o mês
    // mesmo que a descrição diga outra coisa
    data.periodStart = new Date(ano, mes - 1, 1, 12);
    data.periodEnd = new Date(ano, mes, 0, 12);
    // E a marca "· MM/AAAA" da descrição acompanha, para a tela não mentir
    const atual = await prisma.invoice.findUnique({ where: { id }, select: { description: true } });
    const marca = `· ${String(mes).padStart(2, "0")}/${ano}`;
    const base = (data.description as string | undefined) ?? atual?.description ?? "";
    if (base) {
      data.description = /·\s*\d{2}\/\d{4}\b/.test(base) ? base.replace(/·\s*\d{2}\/\d{4}\b/, marca) : `${base} ${marca}`;
    }
  }

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
