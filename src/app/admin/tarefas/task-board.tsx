"use client";

import { useMemo, useState } from "react";
import { CalendarRange, ChevronDown, SlidersHorizontal, Users } from "lucide-react";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
import { cn } from "@/lib/utils";
import { EditTaskForm, type TaskDto } from "./edit-task-form";

type ColumnMeta = { key: string; label: string; accent: string };
type FullTaskDto = TaskDto & { assigneeName: string | null; projectName: string | null; createdAt: string };

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Chave yyyy-mm (UTC) do mês em que a tarefa foi criada */
const monthKeyOf = (iso: string) => iso.slice(0, 7);
const monthLabelOf = (key: string) => {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1]}/${year}`;
};

/** Quadro de tarefas com filtros por responsável e por mês de criação — cada
    colaborador vê as tarefas de todos ou só as de uma pessoa/mês específico. */
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
  const [month, setMonth] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) m.set(t.assigneeId ?? "SEM", (m.get(t.assigneeId ?? "SEM") ?? 0) + 1);
    return m;
  }, [tasks]);

  /* Meses com pelo menos uma tarefa criada, do mais recente pro mais antigo */
  const months = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      const key = monthKeyOf(t.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (assignee === "SEM") list = list.filter((t) => !t.assigneeId);
    else if (assignee !== "TODAS") list = list.filter((t) => t.assigneeId === assignee);
    if (month) list = list.filter((t) => monthKeyOf(t.createdAt) === month);
    return list;
  }, [tasks, assignee, month]);

  const kanbanColumns: KanbanColumn[] = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        cards: filtered
          .filter((t) => t.status === c.key)
          .map((t) => {
            const created = `criado ${new Date(t.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
            const due = t.dueDate ? `até ${new Date(t.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : null;
            return {
              id: t.id,
              title: t.title,
              subtitle: [t.assigneeName, t.projectName].filter(Boolean).join(" · ") || undefined,
              meta: due ? `${created} · ${due}` : created,
              badge: t.priority,
              badgeTone: t.priority === "URGENTE" ? "danger" : t.priority === "ALTA" ? "warn" : "slate",
              color: t.color,
            };
          }),
      })),
    [columns, filtered]
  );

  const hasUnassigned = counts.has("SEM");
  const activeFilterCount = (assignee !== "TODAS" ? 1 : 0) + (month ? 1 : 0);
  const filterSummary = [
    assignee === "SEM" ? "Sem responsável" : assignee !== "TODAS" ? users.find((u) => u.id === assignee)?.name : null,
    month ? monthLabelOf(month) : null,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* Filtros: recolhidos por padrão — abrem só ao clicar, pra não poluir a tela */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
            filtersOpen || activeFilterCount > 0
              ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
              : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
          )}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-brand-500/25 px-1.5 py-0.5 text-[10px] font-bold">{activeFilterCount}</span>
          )}
          <ChevronDown size={13} className={cn("transition-transform", filtersOpen && "rotate-180")} />
        </button>
        {!filtersOpen && filterSummary.length > 0 && (
          <span className="truncate text-xs text-slate-500">{filterSummary.join(" · ")}</span>
        )}
      </div>

      {filtersOpen && (
        <div className="mb-4 space-y-3 rounded-2xl border border-line/60 bg-ink-900/40 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
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

          {months.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <CalendarRange size={13} /> Mês:
              </span>
              <button
                onClick={() => setMonth("")}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  month === ""
                    ? "border-violet/40 bg-violet/15 text-violet"
                    : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
                )}
              >
                Todos
              </button>
              {months.map(([key, count]) => (
                <button
                  key={key}
                  onClick={() => setMonth(key)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                    month === key
                      ? "border-violet/40 bg-violet/15 text-violet"
                      : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
                  )}
                >
                  {monthLabelOf(key)} ({count})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
