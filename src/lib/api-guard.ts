import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { canAccess, type ModuleKey } from "./rbac";

/** Garante sessão de equipe interna (e módulo, se informado). */
export async function requireStaff(module?: ModuleKey): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session || session.role === "CLIENTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (module && !canAccess(session, module)) {
    return NextResponse.json({ error: "Sem permissão para este módulo." }, { status: 403 });
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
