import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
  role: z.enum([
    "ADMIN", "FINANCEIRO", "COMERCIAL", "GESTOR", "SOCIAL_MEDIA",
    "DESIGNER", "TRAFEGO_PAGO", "CONSULTOR", "CLIENTE",
  ]),
  clientId: z.string().optional(),
});

/** Cadastra colaboradores e acessos de cliente — somente ADMIN. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente administradores podem cadastrar usuários." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const { name, email, password, role, clientId } = parsed.data;
  if (role === "CLIENTE" && !clientId) {
    return NextResponse.json({ error: "Selecione a empresa do usuário cliente." }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      clientId: role === "CLIENTE" ? clientId : null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "user.create", entity: "User", entityId: user.id },
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1) });

/** Remove um usuário (colaborador ou acesso de cliente) — somente ADMIN. */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente administradores podem remover usuários." }, { status: 403 });
  }

  // id via querystring (?id=...) — corpos de DELETE podem ser descartados por proxies
  const bodyId = (await req.json().catch(() => null))?.id;
  const parsed = deleteSchema.safeParse({ id: req.nextUrl.searchParams.get("id") ?? bodyId });
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  if (parsed.data.id === session.sub) {
    return NextResponse.json({ error: "Você não pode remover o próprio usuário." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Não é possível remover o último administrador." }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id: user.id } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "user.delete", entity: "User", entityId: user.id },
  });

  return NextResponse.json({ ok: true });
}

const permsSchema = z.object({
  id: z.string().min(1),
  /// { "crm": "ved", "financeiro": "v" } — v=ver, e=editar, d=excluir
  permissionsMatrix: z.record(z.string().regex(/^[ved]{0,3}$/)),
});

/** Define a matriz de permissões granulares de um colaborador — somente ADMIN. */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente administradores alteram permissões." }, { status: 403 });
  }

  const parsed = permsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Administradores sempre têm acesso total." }, { status: 400 });
  }

  // Remove módulos sem nenhuma flag
  const matrix = Object.fromEntries(
    Object.entries(parsed.data.permissionsMatrix).filter(([, flags]) => flags.length > 0)
  );

  await prisma.user.update({ where: { id: target.id }, data: { permissionsMatrix: matrix } });
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "user.permissions", entity: "User", entityId: target.id },
  });

  return NextResponse.json({ ok: true, permissionsMatrix: matrix });
}
