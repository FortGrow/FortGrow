import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

/**
 * Proteção de rotas:
 *  - /admin/** → somente equipe interna (qualquer papel exceto CLIENTE)
 *  - /portal/** → somente usuários CLIENTE (isolados por clientId)
 *  - /login → redireciona quem já está logado para sua área
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isClient = session?.role === "CLIENTE";
  const home = session ? (isClient ? "/portal" : "/admin") : "/login";

  if (pathname === "/" || pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(home, req.url));
    if (pathname === "/") return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && isClient) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }
  if (pathname.startsWith("/portal") && !isClient) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/portal/:path*"],
};
