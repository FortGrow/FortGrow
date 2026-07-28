/**
 * Isolamento multi-tenant do CRM do Cliente.
 *
 * Toda leitura e escrita do CRM passa por aqui. O `clientId` (company_id)
 * NUNCA vem do corpo da requisição de um cliente: vem da sessão, que é
 * assinada. Assim não existe "trocar o id no DevTools" — o parâmetro sequer
 * é lido quando quem chama é um usuário CLIENTE.
 *
 * Dois perfis chegam a este módulo:
 *
 *  - CLIENTE  → sempre a própria empresa (`session.clientId`), sem exceção.
 *  - Equipe FortGrow → precisa informar a empresa explicitamente e ter
 *    permissão no módulo `crm-clientes`, respeitando o escopo do colaborador
 *    (quem só enxerga clientes comissionados continua limitado a eles).
 *
 * O retorno traz `where`, o filtro obrigatório já montado — usar
 * `...ctx.where` em cada query é o que garante que nenhuma consulta
 * escape do tenant.
 */
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { verifyLiveSession } from "./api-guard";
import { allowedClientIds, canSeeClient } from "./client-scope";
import { can, canAccessPortal } from "./rbac";
import { prisma } from "./prisma";
import { DEFAULT_STAGES } from "./crm";

export type CrmContext = {
  session: SessionPayload;
  /** A empresa dona dos dados — o company_id do desenho multi-tenant. */
  clientId: string;
  /** Filtro obrigatório de toda query do CRM. */
  where: { clientId: string };
  /** Equipe FortGrow olhando o CRM de um cliente (modo administrador). */
  staff: boolean;
  /** Pode alterar dados (cliente com a área liberada, ou equipe com edição). */
  canEdit: boolean;
};

function deny(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * Resolve a empresa da requisição.
 *
 * @param clientIdParam empresa pedida — considerado SOMENTE para a equipe
 *   FortGrow. Para um usuário CLIENTE o valor é ignorado por completo.
 */
export async function requireCrm(clientIdParam?: string | null): Promise<CrmContext | NextResponse> {
  const raw = await getSession();
  const session = raw ? await verifyLiveSession(raw) : null;
  if (!session) return deny("Não autorizado.", 401);

  if (session.role === "CLIENTE") {
    if (!session.clientId) return deny("Acesso sem empresa vinculada.", 403);
    // A área "Meu CRM" pode estar bloqueada nas permissões deste acesso
    if (!canAccessPortal(session, "portal.crm")) {
      return deny("Área não liberada para este acesso.", 403);
    }
    return {
      session,
      clientId: session.clientId,
      where: { clientId: session.clientId },
      staff: false,
      canEdit: true,
    };
  }

  // Equipe FortGrow: precisa dizer de qual empresa está falando
  if (!clientIdParam) return deny("Informe a empresa.", 400);
  if (!can(session, "crm-clientes", "view")) {
    return deny("Sem permissão para ver os CRMs dos clientes.", 403);
  }

  const escopo = await allowedClientIds(session);
  if (!canSeeClient(escopo, clientIdParam)) return deny("Cliente fora do seu escopo.", 403);

  const empresa = await prisma.client.findFirst({
    where: { id: clientIdParam, archivedAt: null },
    select: { id: true },
  });
  if (!empresa) return deny("Empresa não encontrada.", 404);

  return {
    session,
    clientId: empresa.id,
    where: { clientId: empresa.id },
    staff: true,
    canEdit: can(session, "crm-clientes", "edit"),
  };
}

/** Bloqueia quem só tem leitura. */
export function requireCrmEdit(ctx: CrmContext): NextResponse | null {
  return ctx.canEdit ? null : deny("Sem permissão para alterar este CRM.", 403);
}

export function isCrmError(v: CrmContext | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}

/**
 * Garante que a empresa tenha um funil. A primeira visita ao CRM cria as
 * sete etapas padrão — ninguém começa com um quadro vazio e sem saber o
 * que fazer. Idempotente: se já existe etapa, não mexe.
 */
export async function ensureStages(clientId: string) {
  const existentes = await prisma.crmStage.count({ where: { clientId } });
  if (existentes > 0) return;
  await prisma.crmStage.createMany({
    data: DEFAULT_STAGES.map((s, i) => ({
      clientId,
      name: s.name,
      color: s.color,
      kind: s.kind,
      position: i,
    })),
  });
}

/**
 * Confere que um registro pertence mesmo à empresa antes de alterar.
 *
 * O `where: { id }` sozinho não basta num sistema multi-tenant: um id de
 * outra empresa acertaria a linha errada. Todas as escritas por id passam
 * por aqui primeiro.
 */
export async function ownedBy<T extends { clientId: string }>(
  row: T | null,
  ctx: CrmContext
): Promise<T | null> {
  return row && row.clientId === ctx.clientId ? row : null;
}
