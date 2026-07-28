import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError } from "@/lib/crm-tenant";
import { logActivity, refreshScore } from "@/lib/crm-repo";
import { TASK_TYPE_KEYS } from "@/lib/crm";
import { invalidResponse } from "@/lib/validation";

/**
 * Atividades da empresa: ligação, reunião, tarefa, follow-up, envio de
 * proposta e lembrete.
 *
 * É a mesma tabela da Agenda — toda atividade tem início e fim, então
 * aparece no calendário sem precisar de um segundo cadastro. Concluir uma
 * atividade ligada a um lead marca o contato e reaquece o Lead Score.
 */

export async function GET(req: NextRequest) {
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;

  const p = req.nextUrl.searchParams;
  const from = p.get("from");
  const to = p.get("to");

  const tasks = await prisma.crmTask.findMany({
    where: {
      ...ctx.where,
      deletedAt: null,
      ...(p.get("leadId") ? { leadId: p.get("leadId")! } : {}),
      ...(p.get("done") ? { done: p.get("done") === "1" } : {}),
      ...(from || to
        ? {
            start: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lt: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { start: "asc" },
    include: {
      owner: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, company: true } },
    },
    take: 500,
  });
  return NextResponse.json({ tasks });
}

const schema = z.object({
  type: z.enum(TASK_TYPE_KEYS as [string, ...string[]]).default("TAREFA"),
  title: z.string().min(2).max(160),
  notes: z.string().max(2000).nullish(),
  start: z.string().min(1),
  /// Duração em minutos — mais natural na interface que pedir a hora final
  minutes: z.coerce.number().int().min(5).max(1440).default(30),
  leadId: z.string().nullish(),
  ownerId: z.string().nullish(),
  remindMin: z.coerce.number().int().min(0).max(10080).nullish(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { minutes, leadId, ownerId, notes, start, ...rest } = parsed.data;
  const inicio = new Date(start);
  if (Number.isNaN(inicio.getTime())) {
    return NextResponse.json({ error: "Data/hora inválida." }, { status: 400 });
  }

  const lead = leadId
    ? await prisma.crmLead.findFirst({ where: { id: leadId, clientId: ctx.clientId, deletedAt: null } })
    : null;
  const owner = ownerId
    ? await prisma.crmMember.findFirst({ where: { id: ownerId, clientId: ctx.clientId } })
    : null;

  const task = await prisma.crmTask.create({
    data: {
      ...rest,
      notes: notes || null,
      clientId: ctx.clientId,
      leadId: lead?.id ?? null,
      ownerId: owner?.id ?? null,
      start: inicio,
      end: new Date(inicio.getTime() + minutes * 60000),
      createdById: ctx.session.sub,
    },
  });

  if (lead) {
    await logActivity(ctx, lead.id, "TAREFA", `Atividade agendada: ${task.title}`, {
      tipo: task.type,
      quando: inicio.toISOString(),
    });
    // Próximo contato do lead acompanha a atividade mais próxima
    if (!lead.nextContactAt || inicio < lead.nextContactAt) {
      await prisma.crmLead.update({ where: { id: lead.id }, data: { nextContactAt: inicio } });
    }
  }

  return NextResponse.json({ task }, { status: 201 });
}

const patchSchema = schema.partial().extend({
  id: z.string().min(1),
  done: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, minutes, leadId, ownerId, done, start, notes, ...rest } = parsed.data;
  const atual = await prisma.crmTask.findFirst({ where: { id, clientId: ctx.clientId, deletedAt: null } });
  if (!atual) return NextResponse.json({ error: "Atividade não encontrada." }, { status: 404 });

  const data: Record<string, unknown> = { ...rest };
  if (notes !== undefined) data.notes = notes || null;

  if (start !== undefined) {
    const inicio = new Date(start);
    if (Number.isNaN(inicio.getTime())) {
      return NextResponse.json({ error: "Data/hora inválida." }, { status: 400 });
    }
    const dur = minutes ?? Math.round((atual.end.getTime() - atual.start.getTime()) / 60000);
    data.start = inicio;
    data.end = new Date(inicio.getTime() + dur * 60000);
  } else if (minutes !== undefined) {
    data.end = new Date(atual.start.getTime() + minutes * 60000);
  }

  if (leadId !== undefined) {
    const lead = leadId
      ? await prisma.crmLead.findFirst({ where: { id: leadId, clientId: ctx.clientId } })
      : null;
    data.leadId = lead?.id ?? null;
  }
  if (ownerId !== undefined) {
    const owner = ownerId
      ? await prisma.crmMember.findFirst({ where: { id: ownerId, clientId: ctx.clientId } })
      : null;
    data.ownerId = owner?.id ?? null;
  }
  if (done !== undefined) {
    data.done = done;
    data.doneAt = done ? new Date() : null;
  }

  const task = await prisma.crmTask.update({ where: { id: atual.id }, data });

  // Concluir atividade de um lead conta como contato feito
  if (done === true && task.leadId) {
    await logActivity(ctx, task.leadId, "TAREFA", `Atividade concluída: ${task.title}`, { tipo: task.type });
    await prisma.crmLead.update({ where: { id: task.leadId }, data: { lastContactAt: new Date() } });
    await refreshScore(task.leadId, ctx.clientId);
  }

  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ctx = await requireCrm(p.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const id = p.get("id");
  const atual = id ? await prisma.crmTask.findFirst({ where: { id, clientId: ctx.clientId } }) : null;
  if (!atual) return NextResponse.json({ error: "Atividade não encontrada." }, { status: 404 });

  await prisma.crmTask.update({ where: { id: atual.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
