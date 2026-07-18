import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { invalidResponse } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  clientId: z.string().min(1),
  convPercent: z.coerce.number().min(0).max(100).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
});

/**
 * Base de cálculo do dashboard de Performance do cliente:
 * % Conversão Real e % Comissão/Margem padrão, aplicados a todas as linhas
 * que não têm override próprio.
 */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const { clientId, convPercent, commissionPercent } = parsed.data;
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, clientId)) {
    return NextResponse.json({ error: "Sem permissão para este cliente." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (convPercent !== undefined) data.perfConvPercent = convPercent;
  if (commissionPercent !== undefined) data.perfCommissionPercent = commissionPercent;
  const client = await prisma.client.update({ where: { id: clientId }, data }).catch(() => null);
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "performance.config", entity: "Client", entityId: clientId },
  });

  return NextResponse.json({
    ok: true,
    config: {
      convPercent: Number(client.perfConvPercent),
      commissionPercent: Number(client.perfCommissionPercent),
    },
  });
}
