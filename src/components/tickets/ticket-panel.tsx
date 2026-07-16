"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { cn, fullDate } from "@/lib/utils";
import { ChevronDown, Loader2, Send } from "lucide-react";

export type TicketDTO = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  clientName?: string;
  createdAt: string;
  messages: { id: string; author: string; content: string; at: string; mine: boolean }[];
};

const STATUS_TONE: Record<string, string> = {
  ABERTO: "bg-brand-500/10 text-brand-400",
  EM_ATENDIMENTO: "bg-violet/10 text-violet",
  AGUARDANDO_CLIENTE: "bg-warn/10 text-warn",
  RESOLVIDO: "bg-grow-500/10 text-grow-400",
  FECHADO: "bg-slate-500/10 text-slate-400",
};

/** Lista de chamados com thread expansível e resposta inline (chat). */
export function TicketPanel({ tickets, canManage }: { tickets: TicketDTO[]; canManage: boolean }) {
  const [openId, setOpenId] = useState<string | null>(tickets[0]?.id ?? null);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function reply(e: FormEvent<HTMLFormElement>, ticketId: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const content = (new FormData(form).get("content") as string)?.trim();
    if (!content) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        form.reset();
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  async function setStatus(ticketId: string, status: string) {
    await fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, status }),
    });
    router.refresh();
  }

  if (tickets.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500">
        Nenhum chamado por aqui. Tudo em dia! 🎉
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => {
        const open = openId === t.id;
        return (
          <div key={t.id} className="card overflow-hidden">
            <button
              onClick={() => setOpenId(open ? null : t.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-ink-800/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-200">{t.subject}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.clientName ? `${t.clientName} · ` : ""}aberto em {fullDate(t.createdAt)} · prioridade {t.priority.toLowerCase()}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_TONE[t.status] ?? STATUS_TONE.FECHADO)}>
                {t.status.replaceAll("_", " ")}
              </span>
              <ChevronDown size={16} className={cn("text-slate-500 transition", open && "rotate-180")} />
            </button>

            {open && (
              <div className="border-t border-line">
                <div className="max-h-80 space-y-3 overflow-y-auto p-5">
                  {t.messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                          m.mine ? "bg-brand-500/15 text-slate-100" : "bg-ink-800 text-slate-300"
                        )}
                      >
                        <p className="mb-1 text-[11px] font-semibold text-slate-500">{m.author}</p>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-line p-4">
                  <form onSubmit={(e) => reply(e, t.id)} className="flex flex-1 gap-2">
                    <input name="content" placeholder="Escreva uma resposta…" className="input flex-1" />
                    <button disabled={sending} className="btn-primary shrink-0 px-3.5">
                      {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </form>
                  {canManage && (
                    <select
                      className="input w-44 shrink-0"
                      value={t.status}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                    >
                      {["ABERTO", "EM_ATENDIMENTO", "AGUARDANDO_CLIENTE", "RESOLVIDO", "FECHADO"].map((s) => (
                        <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
