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
    basePrice: z.coerce.number().min(0).optional(),
    variablePercent: z.coerce.number().min(0).max(100).optional(),
    variableBasis: z.string().max(120).optional(),
  })
  .refine((d) => d.pricingModel === "FIXO" || (d.variablePercent ?? 0) > 0, {
    message: "Informe o percentual variável.",
    path: ["variablePercent"],
  });

/** Cadastra um serviço do catálogo — fixo, variável ou fixo + variável (híbrido). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("servicos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { name, description, pricingModel, basePrice, variablePercent, variableBasis } = parsed.data;

  const exists = await prisma.service.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "Já existe um serviço com este nome." }, { status: 409 });

  const service = await prisma.service.create({
    data: {
      name,
      description: description || null,
      pricingModel,
      basePrice: pricingModel === "VARIAVEL" ? 0 : basePrice ?? 0,
      variablePercent: pricingModel === "FIXO" ? null : variablePercent ?? null,
      variableBasis: pricingModel === "FIXO" ? null : variableBasis || null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "service.create", entity: "Service", entityId: service.id },
  });

  return NextResponse.json({ service }, { status: 201 });
}

/** Remove um serviço do catálogo (id pela querystring); bloqueado se houver clientes vinculados. */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("servicos", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const linked = await prisma.clientService.count({ where: { serviceId: id } });
  if (linked > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir — ${linked} cliente(s) usam este serviço.` },
      { status: 409 }
    );
  }

  await prisma.service.delete({ where: { id } }).catch(() => null);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "service.delete", entity: "Service", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
