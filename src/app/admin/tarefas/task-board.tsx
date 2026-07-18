"use client";

import { useState } from "react";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
import { EditTaskForm, type TaskDto } from "./edit-task-form";

export function TaskBoard({
  columns,
  tasks,
  users,
}: {
  columns: KanbanColumn[];
  tasks: TaskDto[];
  users: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<TaskDto | null>(null);

  return (
    <>
      <KanbanBoard
        columns={columns}
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
