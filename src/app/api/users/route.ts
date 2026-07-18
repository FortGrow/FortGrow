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
  permissionsMatrix: z.record(z.string().regex(/^[ved]{0,3}$/)).optional(),
  // Edição do cadastro (corrigir papel/empresa/status de um login)
  name: z.string().min(2).max(120).optional(),
  role: z
    .enum(["ADMIN", "FINANCEIRO", "COMERCIAL", "GESTOR", "SOCIAL_MEDIA", "DESIGNER", "TRAFEGO_PAGO", "CONSULTOR", "CLIENTE"])
    .optional(),
  clientId: z.string().nullish(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

/**
 * Atualiza um usuário — somente ADMIN. Aceita matriz de permissões e/ou
 * cadastro (nome, papel, empresa, ativo, nova senha). Toda alteração derruba
 * as sessões antigas do usuário na hora (tokenVersion).
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente administradores alteram usuários." }, { status: 403 });
  }

  const parsed = permsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { id, permissionsMatrix, name, role, clientId, active, password } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const data: Record<string, unknown> = { tokenVersion: { increment: 1 } };

  if (permissionsMatrix !== undefined) {
    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "Administradores sempre têm acesso total." }, { status: 400 });
    }
    // Remove módulos sem nenhuma flag
    data.permissionsMatrix = Object.fromEntries(
      Object.entries(permissionsMatrix).filter(([, flags]) => flags.length > 0)
    );
  }

  if (name !== undefined) data.name = name;
  if (active !== undefined) {
    if (target.id === session.sub && !active) {
      return NextResponse.json({ error: "Você não pode desativar o próprio acesso." }, { status: 400 });
    }
    data.active = active;
  }
  if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 10);

  const nextRole = role ?? target.role;
  if (role !== undefined) {
    if (target.id === session.sub && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não pode rebaixar o próprio acesso." }, { status: 400 });
    }
    data.role = role;
  }
  // Papel CLIENTE exige empresa vinculada; demais papéis não têm empresa
  if (nextRole === "CLIENTE") {
    const targetClientId = clientId !== undefined ? clientId : target.clientId;
    if (!targetClientId) {
      return NextResponse.json({ error: "Acesso de cliente precisa da empresa vinculada." }, { status: 400 });
    }
    data.clientId = targetClientId;
  } else if (role !== undefined || clientId !== undefined) {
    data.clientId = null;
  }

  await prisma.user.update({ where: { id }, data });
  await prisma.activityLog.create({
    data: {
      userId: session.sub,
      action: permissionsMatrix !== undefined && name === undefined && role === undefined ? "user.permissions" : "user.update",
      entity: "User",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true, permissionsMatrix: data.permissionsMatrix ?? undefined });
}
