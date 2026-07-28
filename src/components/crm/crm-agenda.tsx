"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_TYPES } from "@/lib/crm";
import { crmDelete, crmGet, crmPatch, type CrmScope } from "./api";
import { CrmTaskForm } from "./crm-task-form";
import type { MemberDto, TaskDto } from "./types";

/**
 * Agenda do CRM em três escalas: dia, semana e mês.
 *
 * As três leem a mesma tabela de atividades — a agenda não é um cadastro
 * separado, é outra forma de olhar o que já foi agendado no lead. A janela
 * consultada acompanha a visão escolhida, então trocar de mês busca só
 * aquele mês em vez de baixar o ano inteiro.
 *
 * Semana começa na segunda (padrão brasileiro de agenda comercial) e o
 * grid de horas vai das 7h às 21h, que é onde cabe o dia de vendas.
 */

type Visao = "dia" | "semana" | "mes";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HORA_INI = 7;
const HORA_FIM = 21;

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Segunda-feira da semana da data. */
function inicioDaSemana(d: Date) {
  const base = inicioDoDia(d);
  const desloc = (base.getDay() + 6) % 7; // domingo(0) → 6
  base.setDate(base.getDate() - desloc);
  return base;
}

function janela(visao: Visao, ref: Date): { de: Date; ate: Date } {
  if (visao === "dia") {
    const de = inicioDoDia(ref);
    return { de, ate: new Date(de.getTime() + 86400000) };
  }
  if (visao === "semana") {
    const de = inicioDaSemana(ref);
    return { de, ate: new Date(de.getTime() + 7 * 86400000) };
  }
  const de = new Date(ref.getFullYear(), ref.getMonth(), 1);
  return { de, ate: new Date(ref.getFullYear(), ref.getMonth() + 1, 1) };
}

export function CrmAgenda({
  scope,
  members,
  leads,
  basePath,
  readOnly = false,
}: {
  scope: CrmScope;
  members: MemberDto[];
  leads: { id: string; name: string }[];
  basePath: string;
  readOnly?: boolean;
}) {
  const [visao, setVisao] = useState<Visao>("semana");
  const [ref, setRef] = useState(() => new Date());
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const { de, ate } = useMemo(() => janela(visao, ref), [visao, ref]);

  async function carregar() {
    setCarregando(true);
    try {
      const r = await crmGet<{ tasks: ApiTask[] }>(
        `/api/crm/tasks?from=${de.toISOString()}&to=${ate.toISOString()}`,
        scope
      );
      setTasks(r.tasks.map(paraDto));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar a agenda.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [de.getTime(), ate.getTime(), scope.clientId]);

  function navegar(passo: number) {
    setRef((atual) => {
      const d = new Date(atual);
      if (visao === "dia") d.setDate(d.getDate() + passo);
      else if (visao === "semana") d.setDate(d.getDate() + passo * 7);
      else d.setMonth(d.getMonth() + passo);
      return d;
    });
  }

  async function concluir(t: TaskDto) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try {
      await crmPatch("/api/crm/tasks", { id: t.id, done: !t.done }, scope);
      router.refresh();
    } catch {
      carregar();
    }
  }

  async function excluir(t: TaskDto) {
    if (!confirm(`Excluir "${t.title}"?`)) return;
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    try {
      await crmDelete("/api/crm/tasks", { id: t.id }, scope);
      router.refresh();
    } catch {
      carregar();
    }
  }

  const titulo =
    visao === "dia"
      ? ref.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
      : visao === "semana"
        ? `${de.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${new Date(ate.getTime() - 86400000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
        : ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => navegar(-1)} className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setRef(new Date())} className="btn-ghost py-1.5 text-xs">Hoje</button>
          <button onClick={() => navegar(1)} className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200">
            <ChevronRight size={16} />
          </button>
          <p className="ml-2 text-sm font-semibold capitalize text-slate-200">{titulo}</p>
          {carregando && <Loader2 size={13} className="animate-spin text-slate-600" />}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-line p-0.5">
            {(["dia", "semana", "mes"] as Visao[]).map((v) => (
              <button
                key={v}
                onClick={() => setVisao(v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                  visao === v ? "bg-brand-500/15 text-brand-300" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {v === "mes" ? "mês" : v}
              </button>
            ))}
          </div>
          {!readOnly && <CrmTaskForm scope={scope} members={members} leads={leads} onDone={carregar} />}
        </div>
      </div>

      {erro && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
          {erro}
        </p>
      )}

      {visao === "mes" ? (
        <VisaoMes de={de} ref_={ref} tasks={tasks} basePath={basePath} onConcluir={concluir} onExcluir={excluir} readOnly={readOnly} />
      ) : (
        <VisaoGrade
          dias={visao === "dia" ? [de] : Array.from({ length: 7 }, (_, i) => new Date(de.getTime() + i * 86400000))}
          tasks={tasks}
          basePath={basePath}
          onConcluir={concluir}
          onExcluir={excluir}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

/** Dia e semana: régua de horas com os blocos posicionados pelo horário. */
function VisaoGrade({
  dias,
  tasks,
  basePath,
  onConcluir,
  onExcluir,
  readOnly,
}: {
  dias: Date[];
  tasks: TaskDto[];
  basePath: string;
  onConcluir: (t: TaskDto) => void;
  onExcluir: (t: TaskDto) => void;
  readOnly: boolean;
}) {
  const hoje = inicioDoDia(new Date()).getTime();
  return (
    <div className="card overflow-x-auto p-0">
      <div className="min-w-[720px]">
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${dias.length}, 1fr)` }}>
          <span />
          {dias.map((d, i) => (
            <div
              key={d.toISOString()}
              className={cn(
                "border-l border-line px-2 py-2 text-center",
                inicioDoDia(d).getTime() === hoje && "bg-brand-500/10"
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {dias.length === 1 ? d.toLocaleDateString("pt-BR", { weekday: "short" }) : DIAS[i]}
              </p>
              <p className="text-sm font-semibold text-slate-300">{d.getDate()}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          {Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => HORA_INI + i).map((h) => (
            <div
              key={h}
              className="grid border-b border-line/50"
              style={{ gridTemplateColumns: `56px repeat(${dias.length}, 1fr)` }}
            >
              <span className="py-1 pr-2 text-right text-[10px] font-medium text-slate-600">{h}h</span>
              {dias.map((d) => {
                const doSlot = tasks.filter((t) => {
                  const s = new Date(t.start);
                  return inicioDoDia(s).getTime() === inicioDoDia(d).getTime() && s.getHours() === h;
                });
                return (
                  <div key={`${d.toISOString()}-${h}`} className="min-h-[2.6rem] border-l border-line/50 p-1">
                    {doSlot.map((t) => (
                      <Bloco key={t.id} t={t} basePath={basePath} onConcluir={onConcluir} onExcluir={onExcluir} readOnly={readOnly} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mês: grade de 6 semanas com as atividades resumidas por dia. */
function VisaoMes({
  de,
  ref_,
  tasks,
  basePath,
  onConcluir,
  onExcluir,
  readOnly,
}: {
  de: Date;
  ref_: Date;
  tasks: TaskDto[];
  basePath: string;
  onConcluir: (t: TaskDto) => void;
  onExcluir: (t: TaskDto) => void;
  readOnly: boolean;
}) {
  const primeiro = inicioDaSemana(de);
  const celulas = Array.from({ length: 42 }, (_, i) => new Date(primeiro.getTime() + i * 86400000));
  const hoje = inicioDoDia(new Date()).getTime();

  return (
    <div className="card overflow-x-auto p-0">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-line">
          {DIAS.map((d) => (
            <span key={d} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celulas.map((d) => {
            const doDia = tasks.filter(
              (t) => inicioDoDia(new Date(t.start)).getTime() === inicioDoDia(d).getTime()
            );
            const foraDoMes = d.getMonth() !== ref_.getMonth();
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "min-h-[6.5rem] border-b border-l border-line/50 p-1.5",
                  foraDoMes && "opacity-35",
                  inicioDoDia(d).getTime() === hoje && "bg-brand-500/10"
                )}
              >
                <p className="mb-1 text-[11px] font-semibold text-slate-500">{d.getDate()}</p>
                <div className="space-y-1">
                  {doDia.slice(0, 3).map((t) => (
                    <Bloco key={t.id} t={t} basePath={basePath} compacto onConcluir={onConcluir} onExcluir={onExcluir} readOnly={readOnly} />
                  ))}
                  {doDia.length > 3 && (
                    <p className="text-[10px] font-medium text-slate-600">+{doDia.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Bloco({
  t,
  basePath,
  compacto = false,
  onConcluir,
  onExcluir,
  readOnly,
}: {
  t: TaskDto;
  basePath: string;
  compacto?: boolean;
  onConcluir: (t: TaskDto) => void;
  onExcluir: (t: TaskDto) => void;
  readOnly: boolean;
}) {
  const tipo = TASK_TYPES[t.type] ?? TASK_TYPES.TAREFA;
  const atrasada = !t.done && new Date(t.start) < new Date();
  const hora = new Date(t.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={cn("group rounded-lg px-1.5 py-1 text-[10px] leading-tight transition", t.done && "opacity-50")}
      style={{ backgroundColor: `${tipo.color}26`, borderLeft: `2px solid ${tipo.color}` }}
      title={`${tipo.label} · ${hora}${t.leadName ? ` · ${t.leadName}` : ""}${t.notes ? `\n${t.notes}` : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn("min-w-0 flex-1 truncate font-semibold", t.done ? "line-through text-slate-500" : "text-slate-200")}>
          {!compacto && <span className="mr-1 font-normal text-slate-400">{hora}</span>}
          {t.title}
        </span>
        {!readOnly && (
          <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button onClick={() => onConcluir(t)} title={t.done ? "Reabrir" : "Concluir"} className="rounded p-0.5 hover:bg-black/30">
              <Check size={10} className={t.done ? "text-slate-500" : "text-grow-400"} />
            </button>
            <button onClick={() => onExcluir(t)} title="Excluir" className="rounded p-0.5 hover:bg-black/30">
              <Trash2 size={10} className="text-danger" />
            </button>
          </span>
        )}
      </div>
      {t.leadName && (
        <Link href={`${basePath}/leads/${t.leadId}`} className="block truncate text-slate-400 hover:text-brand-300">
          {t.leadName}
        </Link>
      )}
      {atrasada && <span className="font-bold text-danger">atrasada</span>}
    </div>
  );
}

/* ── Conversão da resposta da API ── */
type ApiTask = {
  id: string; type: string; title: string; notes: string | null;
  start: string; end: string; done: boolean; remindMin: number | null;
  owner: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
};

const paraDto = (t: ApiTask): TaskDto => ({
  id: t.id,
  type: t.type,
  title: t.title,
  notes: t.notes,
  start: t.start,
  end: t.end,
  done: t.done,
  remindMin: t.remindMin,
  ownerId: t.owner?.id ?? null,
  ownerName: t.owner?.name ?? null,
  leadId: t.lead?.id ?? null,
  leadName: t.lead?.name ?? null,
});
