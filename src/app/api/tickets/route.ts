import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";

const createSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(1),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  clientId: z.string().optional(), // usado pela equipe; clientes usam o próprio
});

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  // Cliente só abre chamado para a própria empresa
  const clientId = session.role === "CLIENTE" ? session.clientId : parsed.data.clientId;
  if (!clientId) return NextResponse.json({ error: "Cliente não informado." }, { status: 400 });

  const ticket = await prisma.ticket.create({
    data: {
      clientId,
      subject: parsed.data.subject,
      priority: parsed.data.priority ?? "MEDIA",
      messages: { create: { authorId: session.sub, content: parsed.data.message } },
    },
  });

  // Notifica administradores sobre novo chamado de cliente
  if (session.role === "CLIENTE") {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: "Novo chamado aberto",
          body: parsed.data.subject,
          href: "/admin/chamados",
        })),
      });
    }
  }

  return NextResponse.json({ ticket }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ABERTO", "EM_ATENDIMENTO", "AGUARDANDO_CLIENTE", "RESOLVIDO", "FECHADO"]),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;
  if (session.role === "CLIENTE") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const ticket = await prisma.ticket.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ ticket });
}
