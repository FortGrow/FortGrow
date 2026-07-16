import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isResponse } from "@/lib/api-guard";

/** Pesquisa global — escopo restrito ao papel do usuário. */
export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isResponse(session)) return session;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  // Cliente: pesquisa apenas nos próprios documentos e chamados
  if (session.role === "CLIENTE") {
    const [docs, tickets] = await Promise.all([
      prisma.document.findMany({ where: { clientId: session.clientId!, name: contains }, take: 5 }),
      prisma.ticket.findMany({ where: { clientId: session.clientId!, subject: contains }, take: 5 }),
    ]);
    return NextResponse.json({
      results: [
        ...docs.map((d) => ({ type: "doc", label: d.name, href: "/portal/documentos" })),
        ...tickets.map((t) => ({ type: "chamado", label: t.subject, href: "/portal/chamados" })),
      ],
    });
  }

  const [clients, leads, projects, tasks] = await Promise.all([
    prisma.client.findMany({ where: { companyName: contains }, take: 5 }),
    prisma.lead.findMany({ where: { companyName: contains }, take: 5 }),
    prisma.project.findMany({ where: { name: contains }, take: 5 }),
    prisma.task.findMany({ where: { title: contains }, take: 5 }),
  ]);

  return NextResponse.json({
    results: [
      ...clients.map((c) => ({ type: "cliente", label: c.companyName, href: `/admin/clientes/${c.id}` })),
      ...leads.map((l) => ({ type: "lead", label: l.companyName, href: "/admin/crm" })),
      ...projects.map((p) => ({ type: "projeto", label: p.name, href: "/admin/projetos" })),
      ...tasks.map((t) => ({ type: "tarefa", label: t.title, href: "/admin/tarefas" })),
    ],
  });
}
