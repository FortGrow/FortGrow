import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { can, type ModuleKey, type PermLevel } from "./rbac";

/**
 * Garante sessão de equipe interna, módulo e nível de permissão.
 * Nível padrão "view"; mutações devem exigir "edit" e remoções "delete".
 */
export async function requireStaff(
  module?: ModuleKey,
  level: PermLevel = "view"
): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session || session.role === "CLIENTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (module && !can(session, module, level)) {
    const acao = level === "delete" ? "excluir" : level === "edit" ? "editar" : "acessar";
    return NextResponse.json({ error: `Sem permissão para ${acao} neste módulo.` }, { status: 403 });
  }
  return session;
}

/** Garante qualquer sessão autenticada. */
export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return session;
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
