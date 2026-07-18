import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { invalidResponse } from "@/lib/validation";
import { serializeEntry, serializeSale, syncEntryFromSales } from "@/lib/performance";
import type { SessionPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Vendas detalhadas de um lançamento de Performance (quem vendeu, valor,
 * comprador, observações). Toda mutação re-sincroniza Vendas e Receita bruta
 * da linha e devolve o lançamento atualizado. A leitura vem embutida no GET
 * de /api/performance — o portal enxerga os detalhes por lá, sem gravar.
 */

async function guardEntry(session: SessionPayload, entryId: string) {
  const entry = await prisma.performanceEntry.findUnique({ where: { id: entryId }, select: { clientId: true } });
  if (!entry) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, entry.clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }
  return null;
}

const createSchema = z.object({
  entryId: z.string().min(1),
  sellerName: z.string().min(1).max(80),
  amount: z.coerce.number().min(0).default(0),
  buyer: z.string().max(120).nullish(),
  notes: z.string().max(500).nullish(),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { entryId, buyer, notes, ...rest } = parsed.data;
  const denied = await guardEntry(session, entryId);
  if (denied) return denied;

  const sale = await prisma.performanceSale.create({
    data: { entryId, buyer: buyer || null, notes: notes || null, ...rest },
  });
  const entry = await syncEntryFromSales(entryId);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.sale.create", entity: "PerformanceSale", entityId: sale.id },
  });
  return NextResponse.json({ sale: serializeSale(sale), entry: entry && serializeEntry(entry) }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  sellerName: z.string().min(1).max(80).optional(),
  amount: z.coerce.number().min(0).optional(),
  buyer: z.string().max(120).nullish(),
  notes: z.string().max(500).nullish(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, buyer, notes, ...rest } = parsed.data;
  const existing = await prisma.performanceSale.findUnique({ where: { id }, select: { entryId: true } });
  if (!existing) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  const denied = await guardEntry(session, existing.entryId);
  if (denied) return denied;

  const data: Record<string, unknown> = { ...rest };
  if (buyer !== undefined) data.buyer = buyer || null;
  if (notes !== undefined) data.notes = notes || null;
  const sale = await prisma.performanceSale.update({ where: { id }, data });
  const entry = await syncEntryFromSales(existing.entryId);
  return NextResponse.json({ ok: true, sale: serializeSale(sale), entry: entry && serializeEntry(entry) });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.performanceSale.findUnique({ where: { id }, select: { entryId: true } });
  if (!existing) return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  const denied = await guardEntry(session, existing.entryId);
  if (denied) return denied;

  await prisma.performanceSale.delete({ where: { id } });
  const entry = await syncEntryFromSales(existing.entryId);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.sale.delete", entity: "PerformanceSale", entityId: id },
  });
  return NextResponse.json({ ok: true, entry: entry && serializeEntry(entry) });
}
