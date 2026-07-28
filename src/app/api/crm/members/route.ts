import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError } from "@/lib/crm-tenant";
import { invalidResponse } from "@/lib/validation";

/**
 * Time comercial da empresa cliente.
 *
 * São as pessoas que atendem os leads — não necessariamente logins do
 * Portal. Um vendedor sem acesso ao sistema continua sendo responsável por
 * negócios e contando na meta; quando ganha acesso, o admin vincula o
 * login pelo campo `userId`.
 */

export async function GET(req: NextRequest) {
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const members = await prisma.crmMember.findMany({
    where: ctx.where,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ members });
}

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().max(30).nullish(),
  department: z.string().max(60).nullish(),
  goal: z.coerce.number().min(0).max(1e12).optional(),
  active: z.boolean().optional(),
  userId: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { userId, email, ...rest } = parsed.data;
  const member = await prisma.crmMember.create({
    data: {
      ...rest,
      email: email || null,
      clientId: ctx.clientId,
      userId: await loginDoTenant(userId, ctx.clientId),
    },
  });
  return NextResponse.json({ member }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = schema.partial().extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, userId, email, ...rest } = parsed.data;
  const atual = await prisma.crmMember.findFirst({ where: { id, clientId: ctx.clientId } });
  if (!atual) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  const data: Record<string, unknown> = { ...rest };
  if (email !== undefined) data.email = email || null;
  if (userId !== undefined) data.userId = await loginDoTenant(userId, ctx.clientId);

  const member = await prisma.crmMember.update({ where: { id: atual.id }, data });
  return NextResponse.json({ member });
}

export async function DELETE(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ctx = await requireCrm(p.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const id = p.get("id");
  const atual = id ? await prisma.crmMember.findFirst({ where: { id, clientId: ctx.clientId } }) : null;
  if (!atual) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  // Os leads dele não somem: ficam sem responsável (onDelete: SetNull)
  await prisma.crmMember.delete({ where: { id: atual.id } });
  return NextResponse.json({ ok: true });
}

/**
 * Só aceita vincular um login do MESMO espaço. Sem esta checagem daria para
 * amarrar o usuário de outro cliente ao time daqui.
 *
 * No CRM da própria FortGrow (`clientId = null`) o vínculo é com um
 * colaborador interno; no de um cliente, com um acesso do Portal daquela
 * empresa.
 */
async function loginDoTenant(userId: string | null | undefined, clientId: string | null) {
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: clientId
      ? { id: userId, clientId, role: "CLIENTE" }
      : { id: userId, role: { not: "CLIENTE" } },
    select: { id: true },
  });
  return user?.id ?? null;
}
