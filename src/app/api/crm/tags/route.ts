import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCrm, requireCrmEdit, isCrmError } from "@/lib/crm-tenant";
import { invalidResponse } from "@/lib/validation";

/** Etiquetas personalizadas da empresa (únicas por tenant). */

export async function GET(req: NextRequest) {
  const ctx = await requireCrm(req.nextUrl.searchParams.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const tags = await prisma.crmTag.findMany({
    where: ctx.where,
    orderBy: { name: "asc" },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json({ tags });
}

const schema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const nome = parsed.data.name.trim();
  const existente = await prisma.crmTag.findFirst({ where: { clientId: ctx.clientId, name: nome } });
  if (existente) return NextResponse.json({ tag: existente });

  const tag = await prisma.crmTag.create({
    data: { clientId: ctx.clientId, name: nome, color: parsed.data.color ?? "#0284c7" },
  });
  return NextResponse.json({ tag }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ctx = await requireCrm(body?.clientId ?? null);
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const parsed = schema.partial().extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return invalidResponse(parsed.error);

  const { id, ...campos } = parsed.data;
  const atual = await prisma.crmTag.findFirst({ where: { id, clientId: ctx.clientId } });
  if (!atual) return NextResponse.json({ error: "Etiqueta não encontrada." }, { status: 404 });

  const tag = await prisma.crmTag.update({ where: { id: atual.id }, data: campos });
  return NextResponse.json({ tag });
}

export async function DELETE(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ctx = await requireCrm(p.get("clientId"));
  if (isCrmError(ctx)) return ctx;
  const bloqueio = requireCrmEdit(ctx);
  if (bloqueio) return bloqueio;

  const id = p.get("id");
  const atual = id ? await prisma.crmTag.findFirst({ where: { id, clientId: ctx.clientId } }) : null;
  if (!atual) return NextResponse.json({ error: "Etiqueta não encontrada." }, { status: 404 });

  await prisma.crmTag.delete({ where: { id: atual.id } });
  return NextResponse.json({ ok: true });
}
