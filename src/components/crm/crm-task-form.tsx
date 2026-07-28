"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { REMINDERS, TASK_TYPES } from "@/lib/crm";
import { crmPatch, crmPost, type CrmScope } from "./api";
import type { MemberDto, TaskDto } from "./types";

/**
 * Agendamento de atividade (ligação, reunião, tarefa, follow-up, proposta,
 * lembrete). O mesmo registro alimenta a lista do lead e o calendário —
 * por isso data e hora são obrigatórias, e a duração vem em minutos, que é
 * como as pessoas pensam ("uma reunião de 30 min"), não em hora final.
 */
export function CrmTaskForm({
  scope,
  members,
  leads,
  leadId,
  task,
  start,
  trigger,
  onDone,
}: {
  scope: CrmScope;
  members: MemberDto[];
  leads: { id: string; name: string }[];
  leadId?: string;
  task?: TaskDto;
  /** Data/hora sugerida (clique numa célula do calendário) */
  start?: Date;
  trigger?: React.ReactNode;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const editando = !!task;

  /** datetime-local exige o horário local sem fuso, no formato aaaa-mm-ddThh:mm */
  const local = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const inicial = task ? local(new Date(task.start)) : local(start ?? proximaHoraCheia());
  const duracao = task
    ? Math.round((new Date(task.end).getTime() - new Date(task.start).getTime()) / 60000)
    : 30;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const f = new FormData(e.currentTarget);
    const corpo = {
      type: String(f.get("type")),
      title: String(f.get("title")).trim(),
      notes: String(f.get("notes") ?? "").trim(),
      // datetime-local devolve horário local; o Date reinterpreta no fuso do navegador
      start: new Date(String(f.get("start"))).toISOString(),
      minutes: Number(f.get("minutes")),
      leadId: String(f.get("leadId") ?? "") || null,
      ownerId: String(f.get("ownerId") ?? "") || null,
      remindMin: f.get("remindMin") === "" ? null : Number(f.get("remindMin")),
    };

    try {
      if (editando) await crmPatch("/api/crm/tasks", { id: task!.id, ...corpo }, scope);
      else await crmPost("/api/crm/tasks", corpo, scope);
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button className="btn-primary">
            <CalendarPlus size={15} /> Nova atividade
          </button>
        )}
      </span>

      {open && (
        <Overlay>
          <form onSubmit={onSubmit} className="card w-full max-w-lg animate-fade-up p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-100">
                {editando ? "Editar atividade" : "Nova atividade"}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink-800">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="tk-type">Tipo</label>
                <select id="tk-type" name="type" defaultValue={task?.type ?? "TAREFA"} className="input">
                  {Object.entries(TASK_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="tk-title">Título *</label>
                <input
                  id="tk-title"
                  name="title"
                  required
                  minLength={2}
                  defaultValue={task?.title}
                  className="input"
                  placeholder="Ex.: Ligar para apresentar a proposta"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="tk-start">Quando *</label>
                  <input id="tk-start" name="start" type="datetime-local" required defaultValue={inicial} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="tk-min">Duração (min)</label>
                  <select id="tk-min" name="minutes" defaultValue={String(duracao)} className="input">
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>{m} minutos</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="tk-lead">Lead relacionado</label>
                  <select id="tk-lead" name="leadId" defaultValue={task?.leadId ?? leadId ?? ""} className="input">
                    <option value="">Nenhum</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="tk-owner">Responsável</label>
                  <select id="tk-owner" name="ownerId" defaultValue={task?.ownerId ?? ""} className="input">
                    <option value="">Sem responsável</option>
                    {members.filter((m) => m.active).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="tk-remind">Lembrete</label>
                <select id="tk-remind" name="remindMin" defaultValue={task?.remindMin?.toString() ?? "60"} className="input">
                  <option value="">Sem lembrete</option>
                  {REMINDERS.map((r) => (
                    <option key={r.min} value={r.min}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="tk-notes">Observações</label>
                <textarea id="tk-notes" name="notes" rows={2} defaultValue={task?.notes ?? ""} className="input resize-y" />
              </div>
            </div>

            {erro && <p className="mt-3 text-sm font-medium text-danger">{erro}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <Loader2 size={15} className="animate-spin" />} Salvar
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}

/** Sugere a próxima hora cheia — 90% dos agendamentos caem em :00. */
function proximaHoraCheia() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}
