import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  price: z.coerce.number().min(0).optional(),
  description: z.string().max(500).optional(),
  /// Entregas do pacote, uma por linha
  deliverables: z.array(z.string().min(1).max(200)).max(50).optional(),
});

/** Cadastra um plano/pacote da FortGrow. */
export async function POST(req: NextRequest) {
  const session = await requireStaff("servicos", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const exists = await prisma.plan.findUnique({ where: { name: parsed.data.name } });
  if (exists) return NextResponse.json({ error: "Já existe um plano com este nome." }, { status: 409 });

  const plan = await prisma.plan.create({
    data: {
      name: parsed.data.name,
      price: parsed.data.price ?? 0,
      description: parsed.data.description || null,
      deliverables: parsed.data.deliverables ?? [],
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "plan.create", entity: "Plan", entityId: plan.id },
  });

  return NextResponse.json({ plan }, { status: 201 });
}

/** Remove um plano (id pela querystring). */
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
