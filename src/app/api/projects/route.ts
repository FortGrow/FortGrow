import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const stageSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(["BACKLOG", "EM_ANDAMENTO", "REVISAO", "CONCLUIDO", "ATRASADO"]),
});

/** Move um projeto de coluna no Kanban. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("projetos", "edit");
  if (isResponse(session)) return session;

  const parsed = stageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const project = await prisma.project.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.stage, progress: parsed.data.stage === "CONCLUIDO" ? 100 : undefined },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "project.status", entity: "Project", entityId: project.id },
  });

  return NextResponse.json({ project });
}

const createSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  deadline: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("projetos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      priority: parsed.data.priority ?? "MEDIA",
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      startDate: new Date(),
      status: "BACKLOG",
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
