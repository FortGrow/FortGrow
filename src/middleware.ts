import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import {
  allowedModules,
  allowedPortalModules,
  canAccess,
  canAccessPortal,
  portalHref,
  portalModuleOf,
  type ModuleKey,
} from "@/lib/rbac";

/** Rota do admin (primeiro segmento) → módulo de permissão exigido. */
const ADMIN_ROUTE_MODULE: Record<string, ModuleKey> = {
  "": "dashboard",
  agenda: "agenda",
  crm: "crm",
  "crm-clientes": "crm-clientes",
  prospeccao: "prospeccao",
  clientes: "clientes",
  servicos: "servicos",
  contratos: "contratos",
  projetos: "projetos",
  tarefas: "tarefas",
  campanhas: "campanhas",
  ia: "ia",
  financeiro: "financeiro",
  comissoes: "comissoes",
  custos: "custos",
  treinamentos: "treinamentos",
  relatorios: "relatorios",
  chamados: "chamados",
  automacoes: "automacoes",
  integracoes: "integracoes",
  equipe: "equipe",
  auditoria: "auditoria",
};

const moduleHref = (key: ModuleKey) => (key === "dashboard" ? "/admin" : `/admin/${key}`);

/**
 * Proteção de rotas:
 *  - /admin/** → somente equipe interna, e SOMENTE nos módulos autorizados
 *    (acesso direto por URL a módulo sem permissão é redirecionado)
 *  - /portal/** → somente usuários CLIENTE (isolados por clientId), e
 *    SOMENTE nas áreas liberadas para aquele acesso
 *  - /login → redireciona quem já está logado para sua área
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isClient = session?.role === "CLIENTE";
  const home = session ? (isClient ? "/portal" : "/admin") : "/login";

  if (pathname === "/" || pathname === "/login") {
    // Sessão revogada/expirada: limpa o cookie e deixa fazer login de novo
    // (sem isso, o cookie antigo causaria loop login → área → login)
    if (pathname === "/login" && req.nextUrl.searchParams.get("expirada") === "1") {
      const res = NextResponse.next();
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    // Logado: vai direto para sua área. Deslogado: "/" mostra o site
    // institucional; "/login" mostra o formulário.
    if (session) return NextResponse.redirect(new URL(home, req.url));
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

  // Mesma regra do admin, do lado do cliente: área não liberada não abre
  // nem digitando a URL. Rotas pessoais (perfil, notificações) ficam livres.
  if (pathname.startsWith("/portal") && isClient) {
    const area = portalModuleOf(pathname.split("/")[2] ?? "");
    if (area && !canAccessPortal(session, area)) {
      const fallback = allowedPortalModules(session)[0];
      const dest = fallback ? portalHref(fallback) : "/portal/perfil";
      if (dest !== pathname) return NextResponse.redirect(new URL(dest, req.url));
      return NextResponse.redirect(new URL("/portal/perfil", req.url));
    }
  }

  // Autorização por módulo no backend: URL direta a módulo sem permissão
  // não abre — o usuário é levado ao primeiro módulo autorizado dele.
  if (pathname.startsWith("/admin") && !isClient) {
    const segment = pathname.split("/")[2] ?? "";
    const requiredModule = ADMIN_ROUTE_MODULE[segment];
    // Rotas pessoais (perfil, notificações) não exigem módulo
    if (requiredModule && !canAccess(session, requiredModule)) {
      const fallback = allowedModules(session!).find((m) => canAccess(session, m));
      const dest = fallback ? moduleHref(fallback) : "/admin/perfil";
      // evita loop caso o destino seja a própria rota bloqueada
      if (dest !== pathname) return NextResponse.redirect(new URL(dest, req.url));
      return NextResponse.redirect(new URL("/admin/perfil", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/portal/:path*"],
};
