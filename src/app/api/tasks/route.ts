import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const COLORS = ["azul", "verde", "roxo", "laranja", "rosa", "vermelho", "ciano", "amarelo"] as const;

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  color: z.enum(COLORS).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("tarefas", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "MEDIA",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assigneeId: parsed.data.assigneeId || session.sub,
      projectId: parsed.data.projectId || null,
      color: parsed.data.color || null,
    },
  });

  // Notifica o responsável delegado
  if (task.assigneeId && task.assigneeId !== session.sub) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        title: "Nova tarefa atribuída",
        body: task.title,
        href: "/admin/tarefas",
      },
    });
  }

  return NextResponse.json({ task }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDA"]).optional(),
  /// Cor do cartão ("" remove a cor)
  color: z.enum(COLORS).optional().or(z.literal("")).optional(),
  // Edição completa do cartão
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  dueDate: z.string().nullish(),
  assigneeId: z.string().nullish(),
});

/** Atualiza a tarefa: coluna (drag & drop), cor e/ou edição completa do cartão. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("tarefas", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { id, stage, color, title, description, priority, dueDate, assigneeId } = parsed.data;

  const before = await prisma.task.findUnique({ where: { id }, select: { assigneeId: true } });
  if (!before) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (stage) data.status = stage;
  if (color !== undefined) data.color = color || null;
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const task = await prisma.task.update({ where: { id }, data });

  // Notifica quem recebeu a tarefa na redelegação
  if (assigneeId && assigneeId !== before.assigneeId && assigneeId !== session.sub) {
    await prisma.notification.create({
      data: { userId: assigneeId, title: "Tarefa atribuída a você", body: task.title, href: "/admin/tarefas" },
    });
  }

  return NextResponse.json({ task });
}

/** Exclui uma tarefa (id via querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("tarefas", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const task = await prisma.task.delete({ where: { id } }).catch(() => null);
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
