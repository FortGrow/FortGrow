import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  companyName: z.string().min(2),
  segment: z.string().max(80).optional(),
  plan: z.string().max(80).optional(),
  billingType: z.enum(["FIXO", "COMISSAO"]).optional(),
  monthlyValue: z.coerce.number().min(0).optional(),
  commissionBase: z.coerce.number().min(0).max(100).optional(),
  commissionShare: z.coerce.number().min(0).max(100).optional(),
  contractMonths: z.coerce.number().int().min(1).max(120).optional(),
  contractStart: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  cnpj: z.string().max(30).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  website: z.string().max(200).optional(),
  instagram: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireStaff("clientes");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { email, contractStart, monthlyValue, billingType, commissionBase, commissionShare, ...rest } = parsed.data;

  if (billingType === "COMISSAO" && (!commissionBase || !commissionShare)) {
    return NextResponse.json(
      { error: "Contratos por comissão precisam da base de comissão do cliente e do percentual da FortGrow." },
      { status: 400 }
    );
  }

  const client = await prisma.client.create({
    data: {
      ...rest,
      email: email || null,
      billingType: billingType ?? "FIXO",
      monthlyValue: billingType === "COMISSAO" ? 0 : monthlyValue ?? 0,
      commissionBase: billingType === "COMISSAO" ? commissionBase! : 0,
      commissionShare: billingType === "COMISSAO" ? commissionShare! : 0,
      contractStart: contractStart ? new Date(contractStart) : new Date(),
      status: "ONBOARDING",
      accountManagerId: session.sub,
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "client.create", entity: "Client", entityId: client.id },
  });

  return NextResponse.json({ client }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1) });

/**
 * Exclui um cliente e tudo que pertence a ele (serviços, contratos,
 * projetos, faturas, documentos, chamados, métricas e acessos ao portal).
 * Somente administradores.
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Somente administradores podem excluir clientes." }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, companyName: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  await prisma.$transaction([
    // Remove os acessos ao portal deste cliente
    prisma.user.deleteMany({ where: { clientId: client.id, role: "CLIENTE" } }),
    // O restante cai em cascata pelas FKs do schema
    prisma.client.delete({ where: { id: client.id } }),
    prisma.activityLog.create({
      data: { userId: session.sub, action: "client.delete", entity: "Client", entityId: client.id },
    }),
  ]);

  return NextResponse.json({ ok: true, deleted: client.companyName });
}
