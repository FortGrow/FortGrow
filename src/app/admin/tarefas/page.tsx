import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { type KanbanColumn } from "@/components/kanban/kanban";
import { shortDate } from "@/lib/utils";
import { TaskBoard } from "./task-board";
import { NewTaskForm } from "./new-task-form";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "A_FAZER", label: "A fazer", accent: "#64748b" },
  { key: "EM_ANDAMENTO", label: "Em andamento", accent: "#0284c7" },
  { key: "EM_REVISAO", label: "Em revisão", accent: "#8b5cf6" },
  { key: "CONCLUIDA", label: "Concluída", accent: "#059669" },
];

export default async function TarefasPage() {
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      include: { assignee: { select: { name: true } }, project: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { active: true, role: { not: "CLIENTE" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const columns: KanbanColumn[] = COLUMNS.map((c) => ({
    ...c,
    cards: tasks
      .filter((t) => t.status === c.key)
      .map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: [t.assignee?.name, t.project?.name].filter(Boolean).join(" · ") || undefined,
        meta: t.dueDate ? `até ${shortDate(t.dueDate)}` : undefined,
        badge: t.priority,
        badgeTone: t.priority === "URGENTE" ? "danger" : t.priority === "ALTA" ? "warn" : "slate",
      })),
  }));

  return (
    <>
      <PageHeader title="Tarefas" subtitle="Delegue, acompanhe prazos e conclua · arraste para mudar o status">
        <NewTaskForm users={users} />
      </PageHeader>
      <TaskBoard columns={columns} />
    </>
  );
}
