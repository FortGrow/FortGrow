import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { icsToken } from "@/lib/agenda";
import { PageHeader } from "@/components/ui/page-header";
import { AgendaCalendar } from "./agenda-calendar";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const session = (await getSession())!;
  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: { not: "CLIENTE" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { archivedAt: null, status: { in: ["ATIVO", "ONBOARDING", "PAUSADO"] } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const host = headers().get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const icsUrl = `${proto}://${host}/api/agenda/ics?t=${icsToken()}`;

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Compromissos da equipe — reuniões, captações, alinhamentos e follow-ups"
      />
      <AgendaCalendar
        me={session.sub}
        users={users}
        clients={clients.map((c) => ({ id: c.id, name: c.companyName }))}
        canEdit={can(session, "agenda", "edit")}
        canDelete={can(session, "agenda", "delete")}
        icsUrl={icsUrl}
      />
    </>
  );
}
