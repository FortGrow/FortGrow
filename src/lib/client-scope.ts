/**
 * Escopo de clientes por colaborador.
 *
 * Colaborador com clientScope = COMISSIONADOS enxerga SOMENTE os clientes
 * onde ele está cadastrado como recebedor de comissão (StaffCommission).
 * A regra é aplicada no backend (páginas e APIs) — não dá para contornar
 * por URL, API ou inspeção do navegador. ADMIN sempre vê tudo.
 */
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

/**
 * IDs de clientes permitidos para a sessão.
 * Retorna null quando não há restrição (admin ou escopo TODOS).
 */
export async function allowedClientIds(session: SessionPayload): Promise<string[] | null> {
  if (session.role === "ADMIN") return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { clientScope: true },
  });
  if (user?.clientScope !== "COMISSIONADOS") return null;
  const rows = await prisma.staffCommission.findMany({
    where: { userId: session.sub },
    select: { clientId: true },
  });
  return rows.map((r) => r.clientId);
}

/** Cláusula where do Prisma para o escopo (vazia quando sem restrição). */
export function clientScopeWhere(ids: string[] | null): { id?: { in: string[] } } {
  return ids === null ? {} : { id: { in: ids } };
}

/** O cliente está dentro do escopo da sessão? */
export function canSeeClient(ids: string[] | null, clientId: string): boolean {
  return ids === null || ids.includes(clientId);
}
