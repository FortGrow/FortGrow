import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { allowedClientIds, clientScopeWhere } from "@/lib/client-scope";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
import { PlanningPanel, type PlanoDto } from "@/components/planning/planning-panel";
import { shortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "BACKLOG", label: "Backlog", accent: "#64748b" },
  { key: "EM_ANDAMENTO", label: "Em andamento", accent: "#0284c7" },
  { key: "REVISAO", label: "Revisão", accent: "#8b5cf6" },
  { key: "ATRASADO", label: "Atrasado", accent: "#f43f5e" },
  { key: "CONCLUIDO", label: "Concluído", accent: "#059669" },
];

export default async function ProjetosPage() {
  const session = (await getSession())!;
  const escopo = await allowedClientIds(session);

  const [projects, plans, clients] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { client: { select: { companyName: true } }, _count: { select: { tasks: true } } },
    }),
    prisma.projectPlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        client: { select: { companyName: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      where: { archivedAt: null, ...clientScopeWhere(escopo) },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const columns: KanbanColumn[] = COLUMNS.map((c) => ({
    ...c,
    cards: projects
      .filter((p) => p.status === c.key)
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.client.companyName,
        meta: p.deadline ? `até ${shortDate(p.deadline)}` : `${p._count.tasks} tarefas`,
        badge: p.priority,
        badgeTone: p.priority === "URGENTE" ? "danger" : p.priority === "ALTA" ? "warn" : "slate",
      })),
  }));

  // `parsed` é Json no banco; o componente cliente precisa do formato tipado
  const planosDto: PlanoDto[] = plans.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    clientName: p.client.companyName,
    projectId: p.projectId,
    projectName: p.project?.name ?? null,
    fileName: p.fileName,
    fileUrl: p.fileUrl,
    fileSize: p.fileSize,
    method: p.method,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    uploadedByName: p.uploadedByName,
    parsed: (p.parsed as PlanoDto["parsed"]) ?? {},
  }));

  return (
    <>
      <PageHeader title="Projetos" subtitle="Cronograma e entregas por cliente · arraste para atualizar o status" />
      <KanbanBoard columns={columns} endpoint="/api/projects" />

      <div className="mt-6">
        <PlanningPanel
          plans={planosDto}
          clients={clients.map((c) => ({ id: c.id, name: c.companyName }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId }))}
          podeEditar={can(session, "projetos", "edit")}
        />
      </div>
    </>
  );
}
