import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

const STATUSES = ["ATIVO", "PAUSADO", "CONCLUIDO", "ATRASADO"] as const;

const createSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  responsible: z.string().max(80).optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(STATUSES).optional(),
});

/** Vincula um serviço do catálogo a um cliente ("contrata" o serviço). */
export async function POST(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { clientId, serviceId, responsible, startDate, deadline, status } = parsed.data;

  const [client, service] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }),
    prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } }),
  ]);
  if (!client || !service) return NextResponse.json({ error: "Cliente ou serviço não encontrado." }, { status: 404 });

  const existing = await prisma.clientService.findFirst({ where: { clientId, serviceId } });
  if (existing) return NextResponse.json({ error: "Este cliente já tem este serviço contratado." }, { status: 409 });

  const clientService = await prisma.clientService.create({
    data: {
      clientId,
      serviceId,
      responsible: responsible || null,
      startDate: startDate ? new Date(startDate) : null,
      deadline: deadline ? new Date(deadline) : null,
      status: status ?? "ATIVO",
    },
  });

  await prisma.activityLog.create({
    data: { userId: session.sub, action: "client_service.create", entity: "ClientService", entityId: clientService.id },
  });

  return NextResponse.json({ clientService }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  responsible: z.string().max(80).nullish(),
  startDate: z.string().nullish(),
  deadline: z.string().nullish(),
  status: z.enum(STATUSES).optional(),
});

/** Atualiza responsável/prazo/status de um serviço já vinculado ao cliente. */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff("clientes", "edit");
  if (isResponse(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id, responsible, startDate, deadline, status } = parsed.data;

  const data: Record<string, unknown> = {};
  if (responsible !== undefined) data.responsible = responsible || null;
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
  if (status !== undefined) data.status = status;

  const clientService = await prisma.clientService.update({ where: { id }, data }).catch(() => null);
  if (!clientService) return NextResponse.json({ error: "Vínculo não encontrado." }, { status: 404 });

  return NextResponse.json({ ok: true, clientService });
}

/** Remove o vínculo de um serviço com o cliente (id pela querystring). */
export async function DELETE(req: NextRequest) {
  const session = await requireStaff("clientes", "delete");
  if (isResponse(session)) return session;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  await prisma.clientService.delete({ where: { id } }).catch(() => null);
  await prisma.activityLog.create({
    data: { userId: session.sub, action: "client_service.delete", entity: "ClientService", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
