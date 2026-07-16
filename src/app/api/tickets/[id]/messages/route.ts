import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";

const schema = z.object({ content: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  // Cliente só responde chamados da própria empresa
  if (session.role === "CLIENTE" && ticket.clientId !== session.clientId) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });

  const message = await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, authorId: session.sub, content: parsed.data.content },
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: session.role === "CLIENTE" ? "ABERTO" : "AGUARDANDO_CLIENTE" },
  });

  return NextResponse.json({ message }, { status: 201 });
}
