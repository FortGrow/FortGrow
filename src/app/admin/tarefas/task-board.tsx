"use client";

import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";

export function TaskBoard({ columns }: { columns: KanbanColumn[] }) {
  return <KanbanBoard columns={columns} endpoint="/api/tasks" />;
}
