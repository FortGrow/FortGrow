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

const stageSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDA"]).optional(),
  /// Cor do cartão ("" remove a cor)
  color: z.enum(COLORS).optional().or(z.literal("")).optional(),
});

/** Atualiza a tarefa: mudança de coluna (drag & drop) e/ou cor do cartão. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("tarefas", "edit");
  if (isResponse(session)) return session;

  const parsed = stageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { id, stage, color } = parsed.data;
  if (!stage && color === undefined) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(stage ? { status: stage } : {}),
      ...(color !== undefined ? { color: color || null } : {}),
    },
  });

  return NextResponse.json({ task });
}
