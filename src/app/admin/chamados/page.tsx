import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { TicketPanel, type TicketDTO } from "@/components/tickets/ticket-panel";

export const dynamic = "force-dynamic";

export default async function ChamadosPage() {
  const session = (await getSession())!;
  const tickets = await prisma.ticket.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { companyName: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
    },
  });

  const dto: TicketDTO[] = tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    clientName: t.client.companyName,
    createdAt: t.createdAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      author: m.author?.name ?? "Sistema",
      content: m.content,
      at: m.createdAt.toISOString(),
      mine: m.author?.id === session.sub,
    })),
  }));

  const openCount = tickets.filter((t) => !["RESOLVIDO", "FECHADO"].includes(t.status)).length;

  return (
    <>
      <PageHeader title="Central de chamados" subtitle={`${openCount} chamado(s) aguardando atendimento`} />
      <TicketPanel tickets={dto} canManage />
    </>
  );
}
