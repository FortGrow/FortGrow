import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireStaff, isResponse } from "@/lib/api-guard";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { can } from "@/lib/rbac";
import { invalidResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

function serialize(e: {
  id: string;
  date: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers: number;
  reach: number;
  nonFollowersPct: unknown;
}) {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    views: e.views,
    likes: e.likes,
    comments: e.comments,
    shares: e.shares,
    saves: e.saves,
    followers: e.followers,
    reach: e.reach,
    nonFollowersPct: Number(e.nonFollowersPct),
  };
}

/**
 * Métricas manuais de Instagram do dashboard de Performance.
 * Mesmas regras do restante do módulo: equipe com módulo Clientes + escopo;
 * cliente do portal lê somente a própria empresa.
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

  const entries = await prisma.instagramEntry.findMany({ where: { clientId }, orderBy: { date: "asc" } });
  return NextResponse.json({ entries: entries.map(serialize) });
}

const counters = {
  views: z.coerce.number().int().min(0).default(0),
  likes: z.coerce.number().int().min(0).default(0),
  comments: z.coerce.number().int().min(0).default(0),
  shares: z.coerce.number().int().min(0).default(0),
  saves: z.coerce.number().int().min(0).default(0),
  followers: z.coerce.number().int().min(0).default(0),
  reach: z.coerce.number().int().min(0).default(0),
  nonFollowersPct: z.coerce.number().min(0).max(100).default(0),
};

const createSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ...counters,
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

  const entry = await prisma.instagramEntry.create({
    data: { clientId, date: new Date(`${date}T12:00:00Z`), ...rest },
  });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.instagram.create", entity: "InstagramEntry", entityId: entry.id },
  });
  return NextResponse.json({ entry: serialize(entry) }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  views: counters.views.optional(),
  likes: counters.likes.optional(),
  comments: counters.comments.optional(),
  shares: counters.shares.optional(),
  saves: counters.saves.optional(),
  followers: counters.followers.optional(),
  reach: counters.reach.optional(),
  nonFollowersPct: counters.nonFollowersPct.optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, date, ...rest } = parsed.data;
  const existing = await prisma.instagramEntry.findUnique({ where: { id }, select: { clientId: true } });
  if (!existing) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, existing.clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }

  const data: Record<string, unknown> = { ...rest };
  if (date) data.date = new Date(`${date}T12:00:00Z`);
  const entry = await prisma.instagramEntry.update({ where: { id }, data });
  return NextResponse.json({ ok: true, entry: serialize(entry) });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.instagramEntry.findUnique({ where: { id }, select: { clientId: true } });
  if (!existing) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, existing.clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }

  await prisma.instagramEntry.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.instagram.delete", entity: "InstagramEntry", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
