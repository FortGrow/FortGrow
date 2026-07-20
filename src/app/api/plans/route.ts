import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const PRICING_MODELS = ["FIXO", "VARIAVEL", "HIBRIDO"] as const;

const createSchema = z
  .object({
    name: z.string().min(2).max(80),
    description: z.string().max(500).optional(),
    pricingModel: z.enum(PRICING_MODELS).default("FIXO"),
    price: z.coerce.number().min(0).optional(),
    variablePercent: z.coerce.number().min(0).max(100).optional(),
    variableBasis: z.string().max(120).optional(),
    /// Entregas do pacote, uma por linha
    deliverables: z.array(z.string().min(1).max(200)).max(50).optional(),
  })
  .refine((d) => d.pricingModel === "FIXO" || (d.variablePercent ?? 0) > 0, {
    message: "Informe o percentual variável.",
    path: ["variablePercent"],
  });

/** Cadastra um plano/pacote da FortGrow — fixo, variável ou fixo + variável (híbrido). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("servicos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { name, description, pricingModel, price, variablePercent, variableBasis, deliverables } = parsed.data;

  const exists = await prisma.plan.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "Já existe um plano com este nome." }, { status: 409 });

  const plan = await prisma.plan.create({
    data: {
      name,
      description: description || null,
      pricingModel,
      price: pricingModel === "VARIAVEL" ? 0 : price ?? 0,
      variablePercent: pricingModel === "FIXO" ? null : variablePercent ?? null,
      variableBasis: pricingModel === "FIXO" ? null : variableBasis || null,
      deliverables: deliverables ?? [],
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "plan.create", entity: "Plan", entityId: plan.id },
  });

  return NextResponse.json({ plan }, { status: 201 });
}

const updateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(2).max(80),
    description: z.string().max(500).optional(),
    pricingModel: z.enum(PRICING_MODELS).default("FIXO"),
    price: z.coerce.number().min(0).optional(),
    variablePercent: z.coerce.number().min(0).max(100).optional(),
    variableBasis: z.string().max(120).optional(),
    deliverables: z.array(z.string().min(1).max(200)).max(50).optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => d.pricingModel === "FIXO" || (d.variablePercent ?? 0) > 0, {
    message: "Informe o percentual variável.",
    path: ["variablePercent"],
  });

/** Edita um plano — nome, modelo de precificação, valores, entregas e descrição. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("servicos", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id, name, description, pricingModel, price, variablePercent, variableBasis, deliverables, active } = parsed.data;

  const exists = await prisma.plan.findFirst({ where: { name, NOT: { id } } });
  if (exists) return NextResponse.json({ error: "Já existe outro plano com este nome." }, { status: 409 });

  const plan = await prisma.plan
    .update({
      where: { id },
      data: {
        name,
        description: description || null,
        pricingModel,
        price: pricingModel === "VARIAVEL" ? 0 : price ?? 0,
        variablePercent: pricingModel === "FIXO" ? null : variablePercent ?? null,
        variableBasis: pricingModel === "FIXO" ? null : variableBasis || null,
        deliverables: deliverables ?? [],
        ...(active !== undefined ? { active } : {}),
      },
    })
    .catch(() => null);
  if (!plan) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });

  // Mantém o texto do plano sincronizado nos clientes ligados a ele (nome pode ter mudado)
  await prisma.client.updateMany({ where: { planId: id }, data: { plan: name } });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "plan.update", entity: "Plan", entityId: plan.id },
  });

  return NextResponse.json({ ok: true, plan });
}

/** Remove um plano (id pela querystring); clientes vinculados ficam sem plano do catálogo. */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("servicos", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.plan.delete({ where: { id } }).catch(() => null);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "plan.delete", entity: "Plan", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
