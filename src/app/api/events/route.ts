import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { invalidResponse } from "@/lib/validation";
import { expandOccurrences } from "@/lib/agenda";
import type { SessionPayload } from "@/lib/auth";

const EVENT_TYPES = ["REUNIAO_CLIENTE", "CAPTACAO", "ALINHAMENTO", "FOLLOW_UP"] as const;
const EVENT_STATUS = ["CONFIRMADO", "PENDENTE", "CANCELADO"] as const;

function canSee(session: SessionPayload, e: { private: boolean; createdById: string | null; attendeeIds: unknown }) {
  if (!e.private || session.role === "ADMIN") return true;
  const attendees = (e.attendeeIds as string[]) ?? [];
  return e.createdById === session.sub || attendees.includes(session.sub);
}

/** Lista eventos do período (?de&ate), com filtros ?colaborador&tipo&cliente. */
export async function GET(req: NextRequest) {
  const session = await requireStaff("agenda", "view");
  if (isResponse(session)) return session;

  const q = req.nextUrl.searchParams;
  const de = q.get("de") ? new Date(q.get("de")!) : new Date(Date.now() - 45 * 86400000);
  const ate = q.get("ate") ? new Date(q.get("ate")!) : new Date(Date.now() + 90 * 86400000);
  const colaborador = q.get("colaborador");
  const tipo = q.get("tipo");
  const cliente = q.get("cliente");

  const rows = await prisma.event.findMany({
    where: {
      // recorrentes entram mesmo com início antes da janela — a expansão filtra
      OR: [{ start: { gte: de, lt: ate } }, { recurrence: { not: "NENHUMA" }, start: { lt: ate } }],
      ...(tipo ? { type: tipo } : {}),
      ...(cliente ? { clientId: cliente } : {}),
    },
    include: {
      client: { select: { companyName: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { start: "asc" },
  });

  const events = rows
    .filter((e) => canSee(session, e))
    .filter((e) => {
      if (!colaborador) return true;
      const attendees = (e.attendeeIds as string[]) ?? [];
      return attendees.includes(colaborador) || e.createdById === colaborador;
    })
    .flatMap((e) =>
      expandOccurrences(e, de, ate).map((occ) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        status: e.status,
        start: occ.start.toISOString(),
        end: occ.end.toISOString(),
        private: e.private,
        recurrence: e.recurrence,
        recurrenceUntil: e.recurrenceUntil?.toISOString() ?? null,
        /// início da série (para edição — a ocorrência exibida pode ser outra data)
        seriesStart: e.start.toISOString(),
        seriesEnd: e.end.toISOString(),
        attendeeIds: (e.attendeeIds as string[]) ?? [],
        clientId: e.clientId,
        clientName: e.client?.companyName ?? null,
        createdById: e.createdById,
        createdByName: e.createdBy?.name ?? null,
      }))
    )
    .sort((a, b) => a.start.localeCompare(b.start));

  return NextResponse.json({ events });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  type: z.enum(EVENT_TYPES).default("REUNIAO_CLIENTE"),
  status: z.enum(EVENT_STATUS).default("CONFIRMADO"),
  start: z.string().min(10),
  end: z.string().min(10),
  private: z.boolean().optional(),
  recurrence: z.enum(["NENHUMA", "SEMANAL", "MENSAL", "ANUAL"]).optional(),
  recurrenceUntil: z.string().nullish(),
  attendeeIds: z.array(z.string()).max(50).optional(),
  clientId: z.string().nullish(),
});

/** Cria um evento e notifica os participantes. */
export async function POST(req: NextRequest) {
  const session = await requireStaff("agenda", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { start, end, attendeeIds, clientId, ...rest } = parsed.data;
  const startAt = new Date(start);
  const endAt = new Date(end);
  if (!(endAt > startAt)) {
    return NextResponse.json({ error: "O término precisa ser depois do início." }, { status: 400 });
  }

  const { recurrenceUntil, ...restFields } = rest;
  const event = await prisma.event.create({
    data: {
      ...restFields,
      description: restFields.description || null,
      start: startAt,
      end: endAt,
      private: restFields.private ?? false,
      recurrence: restFields.recurrence ?? "NENHUMA",
      recurrenceUntil: recurrenceUntil ? new Date(recurrenceUntil) : null,
      attendeeIds: attendeeIds ?? [],
      clientId: clientId || null,
      createdById: session.sub,
    },
  });

  // Notifica os participantes (menos quem criou)
  const when = startAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  for (const uid of (attendeeIds ?? []).filter((id) => id !== session.sub)) {
    await prisma.notification.create({
      data: { userId: uid, title: "Novo evento na agenda", body: `${event.title} — ${when}`, href: "/admin/agenda" },
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "event.create", entity: "Event", entityId: event.id },
  });

  return NextResponse.json({ event }, { status: 201 });
}

const updateSchema = createSchema.partial().extend({ id: z.string().min(1) });

/** Edita um evento (incl. arrastar para outro dia/horário e mudar status). */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("agenda", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, start, end, attendeeIds, clientId, description, recurrenceUntil, ...rest } = parsed.data;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  if (!canSee(session, existing)) return NextResponse.json({ error: "Evento privado." }, { status: 403 });

  const data: Record<string, unknown> = { ...rest };
  if (description !== undefined) data.description = description || null;
  if (start !== undefined) data.start = new Date(start);
  if (end !== undefined) data.end = new Date(end);
  if (attendeeIds !== undefined) data.attendeeIds = attendeeIds;
  if (clientId !== undefined) data.clientId = clientId || null;
  if (recurrenceUntil !== undefined) data.recurrenceUntil = recurrenceUntil ? new Date(recurrenceUntil) : null;

  const startAt = (data.start as Date) ?? existing.start;
  const endAt = (data.end as Date) ?? existing.end;
  if (!(endAt > startAt)) {
    return NextResponse.json({ error: "O término precisa ser depois do início." }, { status: 400 });
  }

  const event = await prisma.event.update({ where: { id }, data });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "event.update", entity: "Event", entityId: id },
  });

  return NextResponse.json({ ok: true, event });
}

/** Exclui um evento (id via querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("agenda", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  if (!canSee(session, existing)) return NextResponse.json({ error: "Evento privado." }, { status: 403 });

  await prisma.event.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "event.delete", entity: "Event", entityId: id },
  });

  return NextResponse.json({ ok: true });
}
