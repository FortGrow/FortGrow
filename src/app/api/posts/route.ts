import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(8),
  title: z.string().min(2).max(160),
  format: z.string().max(40).optional(),
  script: z.string().max(5000).optional(),
  expectedMetrics: z.string().max(500).optional(),
  status: z.enum(["PLANEJADO", "APROVADO", "PUBLICADO"]).optional(),
});

/** Cria uma postagem no calendário do cliente. */
export async function POST(req: NextRequest) {
  const session = await requireStaff("campanhas", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { date, ...rest } = parsed.data;
  const post = await prisma.contentPost.create({
    data: { ...rest, date: new Date(date) },
  });

  // Notifica os usuários do cliente sobre o novo planejamento
  const users = await prisma.user.findMany({
    where: { clientId: parsed.data.clientId, active: true },
    select: { id: true },
  });
  if (users.length) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: "Nova postagem planejada",
        body: `${post.title} — ${new Date(post.date).toLocaleDateString("pt-BR")}`,
        href: "/portal/calendario",
      })),
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "post.create", entity: "ContentPost", entityId: post.id },
  });

  return NextResponse.json({ post }, { status: 201 });
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PLANEJADO", "APROVADO", "PUBLICADO"]),
});

/** Atualiza o status de uma postagem. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("campanhas", "edit");
  if (isResponse(session)) return session;

  const parsed = statusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const post = await prisma.contentPost.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ post });
}

/** Remove uma postagem do calendário (id pela querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("campanhas", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.contentPost.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
