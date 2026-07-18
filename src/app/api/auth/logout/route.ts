import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Encerra a sessão. Responde JSON (o cliente navega para /login por conta
 * própria) — sem redirect do servidor, que atrás do proxy de produção
 * apontava para a URL interna e deixava a aba travada.
 */
export async function POST() {
  const session = await getSession();
  if (session) {
    await prisma.activityLog.create({ data: { userId: session.sub, action: "logout" } }).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

/** Acesso direto pela URL: limpa o cookie e volta ao login (caminho relativo). */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const res = NextResponse.redirect(url, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
