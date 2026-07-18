import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "fortgrow_session";
const SESSION_DURATION_S = 60 * 60 * 12; // 12h

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: string;
  clientId: string | null;
  permissions: string[];
  /** Matriz granular por módulo, flags "ved" (v=ver, e=editar, d=excluir). */
  perms?: Record<string, string>;
  /** Versão do token — divergência com o banco revoga a sessão imediatamente. */
  tv?: number;
};

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Sessão do usuário logado (server components / route handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_S,
  };
}
