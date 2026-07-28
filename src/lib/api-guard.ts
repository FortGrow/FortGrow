import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { can, canAccessPortal, type ModuleKey, type PermLevel, type PortalModuleKey } from "./rbac";
import { prisma } from "./prisma";

/**
 * Revogação imediata: confere no banco se o usuário segue ativo e se a
 * versão do token bate. Permissões alteradas/senha trocada derrubam
 * sessões antigas na próxima requisição.
 */
export async function verifyLiveSession(session: SessionPayload): Promise<SessionPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { active: true, tokenVersion: true, permissionsMatrix: true, role: true, clientId: true },
  });
  if (!user || !user.active) return null;
  if ((session.tv ?? 0) !== user.tokenVersion) return null;
  // Sincroniza papel, empresa e matriz mais recentes (o token pode estar defasado)
  return {
    ...session,
    perms: (user.permissionsMatrix as Record<string, string>) ?? {},
    role: user.role,
    clientId: user.clientId,
  };
}

/**
 * Garante sessão de equipe interna, módulo e nível de permissão.
 * Nível padrão "view"; mutações devem exigir "edit" e remoções "delete".
 */
export async function requireStaff(
  module?: ModuleKey,
  level: PermLevel = "view"
): Promise<SessionPayload | NextResponse> {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  if (!session || session.role === "CLIENTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (module && !can(session, module, level)) {
    const acao = level === "delete" ? "excluir" : level === "edit" ? "editar" : "acessar";
    return NextResponse.json({ error: `Sem permissão para ${acao} neste módulo.` }, { status: 403 });
  }
  return session;
}

/**
 * Rotas que o Portal do Cliente consome: além de autenticar, confere se a
 * área está liberada para aquele acesso — senão bloquear no menu e na URL
 * seria só fachada, bastando chamar a API direto. Equipe interna passa por
 * estas rotas normalmente (elas também servem o admin).
 */
export async function requirePortal(area: PortalModuleKey): Promise<SessionPayload | NextResponse> {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (session.role === "CLIENTE" && !canAccessPortal(session, area)) {
    return NextResponse.json({ error: "Área não liberada para este acesso." }, { status: 403 });
  }
  return session;
}

/** Garante qualquer sessão autenticada (com revogação imediata). */
export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return session;
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
