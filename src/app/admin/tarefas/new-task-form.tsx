"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

export function NewTaskForm({ users }: { users: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(Array.from(form.entries()).filter(([, v]) => String(v).trim() !== ""));
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={15} /> Nova tarefa
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 py-10 backdrop-blur-sm sm:items-center">
      <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Nova tarefa</h2>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Título *</label>
            <input id="title" name="title" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">Descrição</label>
            <textarea id="description" name="description" rows={2} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="assigneeId">Delegar para</label>
              <select id="assigneeId" name="assigneeId" className="input">
                <option value="">Eu mesmo</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="priority">Prioridade</label>
              <select id="priority" name="priority" className="input" defaultValue="MEDIA">
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dueDate">Prazo</label>
              <input id="dueDate" name="dueDate" type="date" className="input" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />} Criar tarefa
          </button>
        </div>
      </form>
    </div>
  );
}
