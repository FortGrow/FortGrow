import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { TicketPanel, type TicketDTO } from "@/components/tickets/ticket-panel";
import { NewTicketForm } from "./new-ticket-form";

export const dynamic = "force-dynamic";

export default async function PortalChamadosPage() {
  const session = (await getSession())!;
  const tickets = await prisma.ticket.findMany({
    where: { clientId: session.clientId! },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
    },
  });

  const dto: TicketDTO[] = tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      author: m.author?.name ?? "Equipe FortGrow",
      content: m.content,
      at: m.createdAt.toISOString(),
      mine: m.author?.id === session.sub,
    })),
  }));

  return (
    <>
      <PageHeader title="Central de chamados" subtitle="Fale com a equipe FortGrow — respondemos por aqui">
        <NewTicketForm />
      </PageHeader>
      <TicketPanel tickets={dto} canManage={false} />
    </>
  );
}
