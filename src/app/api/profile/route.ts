import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().max(30).optional(),
});

/** Atualiza nome e telefone do próprio usuário e reemite o token de sessão. */
export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.sub },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "profile.update" } });

  const token = await createSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
    permissions: user.permissions,
    perms: (user.permissionsMatrix as Record<string, string>) ?? {},
    tv: user.tokenVersion,
  });
  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
