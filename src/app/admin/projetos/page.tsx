import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
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
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { client: { select: { companyName: true } }, _count: { select: { tasks: true } } },
  });

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

  return (
    <>
      <PageHeader title="Projetos" subtitle="Cronograma e entregas por cliente · arraste para atualizar o status" />
      <KanbanBoard columns={columns} endpoint="/api/projects" />
    </>
  );
}
