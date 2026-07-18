import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe e-mail e senha válidos." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId: user.id,
        ip,
        userAgent: req.headers.get("user-agent"),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    }),
    prisma.activityLog.create({
      data: { userId: user.id, action: "login", ip },
    }),
  ]);

  const res = NextResponse.json({
    ok: true,
    home: user.role === "CLIENTE" ? "/portal" : "/admin",
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
