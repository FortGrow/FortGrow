import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  category: z.string().min(2).max(60),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  duration: z.string().max(30).optional(),
});

/** Publica um treinamento (aparece no portal sem alterar código). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("treinamentos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos — confira o link do vídeo." }, { status: 400 });
  }

  const training = await prisma.training.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      videoUrl: parsed.data.videoUrl,
      thumbnailUrl: parsed.data.thumbnailUrl || null,
      duration: parsed.data.duration || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "training.create", entity: "Training", entityId: training.id },
  });

  return NextResponse.json({ training }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(1000).nullish(),
  category: z.string().min(2).max(60).optional(),
  videoUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().nullish().or(z.literal("")),
  duration: z.string().max(30).nullish(),
  active: z.boolean().optional(),
});

/** Edita um treinamento publicado (conteúdo totalmente editável). */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("treinamentos", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos — confira o link do vídeo." }, { status: 400 });
  }

  const { id, description, thumbnailUrl, duration, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (description !== undefined) data.description = description || null;
  if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl || null;
  if (duration !== undefined) data.duration = duration || null;

  const training = await prisma.training.update({ where: { id }, data }).catch(() => null);
  if (!training) return NextResponse.json({ error: "Treinamento não encontrado." }, { status: 404 });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "training.update", entity: "Training", entityId: id },
  });

  return NextResponse.json({ ok: true, training });
}

/** Remove um treinamento (id pela querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("treinamentos", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.training.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
