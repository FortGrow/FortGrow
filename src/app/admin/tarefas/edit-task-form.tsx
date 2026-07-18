"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { CARD_COLORS } from "@/components/kanban/kanban";

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  color: string | null;
  status: string;
};

/** Edição completa de um cartão de tarefa (título, responsável, prazo, cor…). */
export function EditTaskForm({
  task,
  users,
  onClose,
}: {
  task: TaskDto;
  users: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [color, setColor] = useState(task.color ?? "");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          title: form.get("title"),
          description: form.get("description"),
          priority: form.get("priority"),
          dueDate: form.get("dueDate"),
          assigneeId: form.get("assigneeId"),
          stage: form.get("stage"),
          color,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(onClose, 800);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks?id=${encodeURIComponent(task.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível excluir.");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Editar tarefa</h2>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="et-title">Título *</label>
            <input id="et-title" name="title" required defaultValue={task.title} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="et-description">Descrição</label>
            <textarea id="et-description" name="description" rows={2} defaultValue={task.description ?? ""} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="et-assignee">Responsável</label>
              <select id="et-assignee" name="assigneeId" defaultValue={task.assigneeId ?? ""} className="input">
                <option value="">Sem responsável</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="et-priority">Prioridade</label>
              <select id="et-priority" name="priority" defaultValue={task.priority} className="input">
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="et-due">Prazo</label>
              <input id="et-due" name="dueDate" type="date" defaultValue={task.dueDate?.slice(0, 10) ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="et-stage">Coluna</label>
              <select id="et-stage" name="stage" defaultValue={task.status} className="input">
                <option value="A_FAZER">A fazer</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="EM_REVISAO">Em revisão</option>
                <option value="CONCLUIDA">Concluída</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Cor do cartão</label>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(CARD_COLORS).map(([key, hex]) => (
                <button
                  key={key}
                  type="button"
                  title={key}
                  onClick={() => setColor((c) => (c === key ? "" : key))}
                  className={`h-6 w-6 rounded-full transition hover:scale-110 ${color === key ? "ring-2 ring-white/80 ring-offset-2 ring-offset-ink-900" : ""}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <span className="text-xs text-slate-500">{color || "sem cor"}</span>
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          {confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-3 py-2 text-xs font-bold text-white transition hover:bg-danger/80 disabled:opacity-40"
            >
              <Trash2 size={13} /> Confirmar exclusão?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={13} /> Excluir tarefa
            </button>
          )}
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                <CheckCircle2 size={15} /> Tarefa atualizada!
              </span>
            )}
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={15} className="animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}
