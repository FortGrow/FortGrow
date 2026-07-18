import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const schema = z.object({
  clientId: z.string().min(1),
  userId: z.string().min(1),
  type: z.enum(["PERCENTUAL", "FIXO"]),
  value: z.coerce.number().positive(),
  note: z.string().max(200).optional(),
});

/** Cadastra/atualiza a comissão de um colaborador em um cliente. */
export async function POST(req: NextRequest) {
  const session = await requireStaff("financeiro");
  if (isResponse(session)) return session;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  if (parsed.data.type === "PERCENTUAL" && parsed.data.value > 100) {
    return NextResponse.json({ error: "Percentual não pode exceder 100%." }, { status: 400 });
  }

  const { clientId, userId, type, value, note } = parsed.data;
  const commission = await prisma.staffCommission.upsert({
    where: { clientId_userId: { clientId, userId } },
    create: { clientId, userId, type, value, note: note || null },
    update: { type, value, note: note || null },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "staff_commission.set", entity: "StaffCommission", entityId: commission.id },
  });

  return NextResponse.json({ commission }, { status: 201 });
}

/** Remove a comissão (id pela querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("financeiro");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.staffCommission.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
