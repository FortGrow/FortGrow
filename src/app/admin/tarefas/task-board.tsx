"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
import { cn } from "@/lib/utils";
import { EditTaskForm, type TaskDto } from "./edit-task-form";

type ColumnMeta = { key: string; label: string; accent: string };
type FullTaskDto = TaskDto & { assigneeName: string | null; projectName: string | null };

/** Quadro de tarefas com filtro por responsável — cada colaborador vê as
    tarefas de todos ("Todas") ou só as de uma pessoa específica. */
export function TaskBoard({
  columns,
  tasks,
  users,
}: {
  columns: ColumnMeta[];
  tasks: FullTaskDto[];
  users: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<TaskDto | null>(null);
  const [assignee, setAssignee] = useState<string>("TODAS");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) m.set(t.assigneeId ?? "SEM", (m.get(t.assigneeId ?? "SEM") ?? 0) + 1);
    return m;
  }, [tasks]);

  const filtered = useMemo(() => {
    if (assignee === "TODAS") return tasks;
    if (assignee === "SEM") return tasks.filter((t) => !t.assigneeId);
    return tasks.filter((t) => t.assigneeId === assignee);
  }, [tasks, assignee]);

  const kanbanColumns: KanbanColumn[] = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        cards: filtered
          .filter((t) => t.status === c.key)
          .map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: [t.assigneeName, t.projectName].filter(Boolean).join(" · ") || undefined,
            meta: t.dueDate ? `até ${new Date(t.dueDate).toLocaleDateString("pt-BR")}` : undefined,
            badge: t.priority,
            badgeTone: t.priority === "URGENTE" ? "danger" : t.priority === "ALTA" ? "warn" : "slate",
            color: t.color,
          })),
      })),
    [columns, filtered]
  );

  const hasUnassigned = counts.has("SEM");

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <Users size={13} /> Responsável:
        </span>
        <button
          onClick={() => setAssignee("TODAS")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
            assignee === "TODAS"
              ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
              : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
          )}
        >
          Todas ({tasks.length})
        </button>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setAssignee(u.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              assignee === u.id
                ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
            )}
          >
            {u.name} ({counts.get(u.id) ?? 0})
          </button>
        ))}
        {hasUnassigned && (
          <button
            onClick={() => setAssignee("SEM")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              assignee === "SEM"
                ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
            )}
          >
            Sem responsável ({counts.get("SEM") ?? 0})
          </button>
        )}
      </div>

      <KanbanBoard
        columns={kanbanColumns}
        endpoint="/api/tasks"
        colorable
        onEdit={(id) => {
          const t = tasks.find((t) => t.id === id);
          if (t) setEditing(t);
        }}
      />
      {editing && <EditTaskForm task={editing} users={users} onClose={() => setEditing(null)} />}
    </>
  );
}
