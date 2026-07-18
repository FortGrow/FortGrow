import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "A nova senha precisa de pelo menos 8 caracteres."),
});

/** Troca a senha do próprio usuário (exige a senha atual). */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
  }

  // Troca a senha e invalida todas as outras sessões (tokenVersion++)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10), tokenVersion: { increment: 1 } },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "profile.password_change" } });

  // Reemite o cookie desta sessão com a nova versão — o usuário continua logado aqui
  const token = await createSessionToken({
    sub: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    clientId: updated.clientId,
    permissions: updated.permissions,
    perms: (updated.permissionsMatrix as Record<string, string>) ?? {},
    tv: updated.tokenVersion,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
