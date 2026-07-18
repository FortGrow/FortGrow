import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireStaff, isResponse } from "@/lib/api-guard";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { can } from "@/lib/rbac";
import { invalidResponse } from "@/lib/validation";
import { ENTRY_INCLUDE, serializeEntry } from "@/lib/performance";

export const dynamic = "force-dynamic";


/**
 * Lançamentos de performance de um cliente.
 * Equipe: exige módulo Clientes + escopo (comissionados veem só os seus).
 * Cliente do portal: sempre e somente a própria empresa (parâmetro ignorado).
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  let clientId: string;
  if (session.role === "CLIENTE") {
    if (!session.clientId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    clientId = session.clientId;
  } else {
    if (!can(session, "clientes", "view")) {
      return NextResponse.json({ error: "Sem permissão para acessar neste módulo." }, { status: 403 });
    }
    const param = req.nextUrl.searchParams.get("clientId");
    if (!param) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const scope = await allowedClientIds(session);
    if (!canSeeClient(scope, param)) {
      return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
    }
    clientId = param;
  }

  const [entries, client] = await Promise.all([
    prisma.performanceEntry.findMany({ where: { clientId }, orderBy: { date: "asc" }, include: ENTRY_INCLUDE }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { perfConvPercent: true, perfCommissionPercent: true },
    }),
  ]);
  return NextResponse.json({
    entries: entries.map(serializeEntry),
    config: {
      convPercent: Number(client?.perfConvPercent ?? 100),
      commissionPercent: Number(client?.perfCommissionPercent ?? 100),
    },
  });
}

const SOURCES = ["INDICACAO", "TRAFEGO_PAGO", "ORGANICO", "SOCIAL", "OUTRO"] as const;

/** Override de % por linha: número 0–100 ou null (volta ao padrão do cliente). */
const percentOverride = z.preprocess(
  (v) => (v === "" ? null : v),
  z.coerce.number().min(0).max(100).nullable()
);

const createSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  investment: z.coerce.number().min(0).default(0),
  leads: z.coerce.number().int().min(0).default(0),
  sales: z.coerce.number().int().min(0).default(0),
  revenue: z.coerce.number().min(0).default(0),
  convPercent: percentOverride.optional(),
  commissionPercent: percentOverride.optional(),
  source: z.enum(SOURCES).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { clientId, date, ...rest } = parsed.data;
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { archivedAt: true } });
  if (!client || client.archivedAt) {
    return NextResponse.json({ error: "Cliente não encontrado (ou na Lixeira)." }, { status: 404 });
  }

  const entry = await prisma.performanceEntry.create({
    data: { clientId, date: new Date(`${date}T12:00:00Z`), ...rest },
    include: ENTRY_INCLUDE,
  });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.create", entity: "PerformanceEntry", entityId: entry.id },
  });
  return NextResponse.json({ entry: serializeEntry(entry) }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  investment: z.coerce.number().min(0).optional(),
  leads: z.coerce.number().int().min(0).optional(),
  sales: z.coerce.number().int().min(0).optional(),
  revenue: z.coerce.number().min(0).optional(),
  convPercent: percentOverride.optional(),
  commissionPercent: percentOverride.optional(),
  source: z.enum(SOURCES).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, date, ...rest } = parsed.data;
  const existing = await prisma.performanceEntry.findUnique({ where: { id }, select: { clientId: true } });
  if (!existing) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, existing.clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }

  const data: Record<string, unknown> = { ...rest };
  if (date) data.date = new Date(`${date}T12:00:00Z`);
  const entry = await prisma.performanceEntry.update({ where: { id }, data, include: ENTRY_INCLUDE });
  return NextResponse.json({ ok: true, entry: serializeEntry(entry) });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.performanceEntry.findUnique({ where: { id }, select: { clientId: true } });
  if (!existing) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, existing.clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }

  await prisma.performanceEntry.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.delete", entity: "PerformanceEntry", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
