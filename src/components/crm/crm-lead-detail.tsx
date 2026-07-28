"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, CalendarClock, Loader2, Mail, MapPin, MessageCircle, Phone,
  Send, Tag as TagIcon, User2,
} from "lucide-react";
import { brl, cn, fullDate } from "@/lib/utils";
import { ACTIVITY_TYPES, agoLabel, daysSince, TASK_TYPES, TEMPERATURES } from "@/lib/crm";
import { crmPatch, crmPost, type CrmScope } from "./api";
import { CrmLeadForm } from "./crm-lead-form";
import { CrmTaskForm } from "./crm-task-form";
import type { ActivityDto, LeadDto, MemberDto, StageDto, TagDto, TaskDto } from "./types";

/**
 * Ficha do lead: dados, indicadores, atividades agendadas e a linha do
 * tempo completa.
 *
 * A timeline é o coração da ficha — quase tudo nela é gravado sozinho
 * (criação, mudança de etapa, edição, arquivo, atividade), então o
 * histórico existe mesmo quando ninguém se lembra de anotar. O campo de
 * observação e o botão "registrar contato" são os dois caminhos manuais.
 */
export function CrmLeadDetail({
  lead,
  activities: iniciais,
  tasks,
  stages,
  members,
  tags,
  scope,
  basePath,
  readOnly = false,
}: {
  lead: LeadDto;
  activities: ActivityDto[];
  tasks: TaskDto[];
  stages: StageDto[];
  members: MemberDto[];
  tags: TagDto[];
  scope: CrmScope;
  basePath: string;
  readOnly?: boolean;
}) {
  const [activities, setActivities] = useState(iniciais);
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const dias = daysSince(lead.lastContactAt ?? lead.createdAt);
  const temp = TEMPERATURES[lead.temperature];
  const abertas = tasks.filter((t) => !t.done);

  async function registrar(tipo: "NOTA" | "CONTATO") {
    const texto = tipo === "CONTATO" && !nota.trim() ? "Contato realizado" : nota.trim();
    if (!texto) return;
    setSalvando(true);
    setErro(null);
    try {
      const { activity } = await crmPost<{ activity: ActivityDto }>(
        "/api/crm/activities",
        { leadId: lead.id, type: tipo, content: texto },
        scope
      );
      setActivities((prev) => [activity, ...prev]);
      setNota("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setSalvando(false);
    }
  }

  async function moverEtapa(stageId: string) {
    setErro(null);
    try {
      await crmPatch("/api/crm/leads", { id: lead.id, stageId }, scope);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível mover.");
    }
  }

  return (
    <div className="space-y-5">
      <Link href={`${basePath}/leads`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300">
        <ArrowLeft size={13} /> Voltar para os leads
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {/* ── Cabeçalho ── */}
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-100">{lead.name}</h1>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{ backgroundColor: `${lead.stageColor}26`, color: lead.stageColor }}
                  >
                    {lead.stageName}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{ backgroundColor: `${temp?.color}26`, color: temp?.color }}
                  >
                    {temp?.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {[lead.jobTitle, lead.company].filter(Boolean).join(" · ") || "Sem empresa informada"}
                </p>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-2">
                  <CrmTaskForm
                    scope={scope}
                    members={members}
                    leads={[{ id: lead.id, name: lead.name }]}
                    leadId={lead.id}
                    trigger={<button className="btn-ghost text-xs"><CalendarClock size={14} /> Agendar</button>}
                  />
                  <CrmLeadForm
                    stages={stages}
                    members={members}
                    tags={tags}
                    scope={scope}
                    lead={lead}
                    trigger={<button className="btn-primary text-xs">Editar</button>}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info icon={<Mail size={13} />} label="E-mail" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
              <Info icon={<Phone size={13} />} label="Telefone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
              <Info
                icon={<MessageCircle size={13} />}
                label="WhatsApp"
                value={lead.whatsapp}
                href={lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}` : undefined}
              />
              <Info icon={<MapPin size={13} />} label="Cidade" value={[lead.city, lead.state].filter(Boolean).join("/")} />
              <Info icon={<Building2 size={13} />} label="Origem" value={lead.source} />
              <Info icon={<User2 size={13} />} label="Responsável" value={lead.ownerName} />
            </div>

            {lead.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <TagIcon size={12} className="text-slate-600" />
                {lead.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${t.color}26`, color: t.color }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {lead.notes && (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-ink-850 p-3 text-sm text-slate-400 ring-1 ring-inset ring-line">
                {lead.notes}
              </p>
            )}
          </div>

          {/* ── Mover no funil ── */}
          {!readOnly && (
            <div className="card p-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Mover no funil</p>
              <div className="flex flex-wrap gap-1.5">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => s.id !== lead.stageId && moverEtapa(s.id)}
                    disabled={s.id === lead.stageId}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                      s.id === lead.stageId ? "cursor-default" : "hover:scale-105"
                    )}
                    style={
                      s.id === lead.stageId
                        ? { backgroundColor: s.color, color: "#0b0e14" }
                        : { backgroundColor: `${s.color}1f`, color: s.color }
                    }
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Registrar / linha do tempo ── */}
          {!readOnly && (
            <div className="card p-4">
              <label className="label" htmlFor="nota">Registrar no histórico</label>
              <textarea
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="O que aconteceu nessa conversa?"
                className="input resize-y"
              />
              {erro && <p className="mt-2 text-sm font-medium text-danger">{erro}</p>}
              <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                <button onClick={() => registrar("CONTATO")} disabled={salvando} className="btn-ghost py-2 text-xs">
                  {salvando ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
                  Registrar contato
                </button>
                <button onClick={() => registrar("NOTA")} disabled={salvando || !nota.trim()} className="btn-primary py-2 text-xs">
                  <Send size={13} /> Salvar observação
                </button>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-300">Linha do tempo</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-600">Nada registrado ainda.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-line pl-5">
                {activities.map((a) => {
                  const tipo = ACTIVITY_TYPES[a.type] ?? ACTIVITY_TYPES.NOTA;
                  return (
                    <li key={a.id} className="relative">
                      <span
                        className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-ink-900"
                        style={{ backgroundColor: tipo.color }}
                      />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tipo.color }}>
                          {tipo.label}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {new Date(a.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                          {a.authorName && ` · ${a.authorName}`}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-300">{a.content}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* ── Coluna lateral ── */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-300">Indicadores</h2>
            <div className="space-y-3">
              <Indicador label="Valor potencial" valor={brl(lead.estimatedValue)} />
              {lead.wonValue !== null && <Indicador label="Valor ganho" valor={brl(lead.wonValue)} destaque="grow" />}
              {lead.stageKind === "PERDIDO" && (
                <Indicador label="Valor perdido" valor={brl(lead.estimatedValue)} destaque="danger" />
              )}
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Lead Score</span>
                  <span className="text-sm font-bold" style={{ color: temp?.color }}>{lead.score}/100</span>
                </div>
                <span className="block h-1.5 overflow-hidden rounded-full bg-ink-700">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${lead.score}%`, backgroundColor: temp?.color }}
                  />
                </span>
              </div>
              <Indicador label="Probabilidade de fechamento" valor={`${lead.probability}%`} />
              <Indicador label="Dias sem contato" valor={agoLabel(dias)} destaque={dias !== null && dias > 7 ? "warn" : undefined} />
              <Indicador label="Criado em" valor={fullDate(lead.createdAt)} />
              {lead.nextContactAt && <Indicador label="Próximo contato" valor={fullDate(lead.nextContactAt)} />}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-300">
              Atividades {abertas.length > 0 && <span className="text-brand-400">({abertas.length} aberta{abertas.length > 1 ? "s" : ""})</span>}
            </h2>
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-600">Nenhuma atividade agendada.</p>
            ) : (
              <ul className="space-y-2.5">
                {tasks.map((t) => {
                  const tipo = TASK_TYPES[t.type] ?? TASK_TYPES.TAREFA;
                  const atrasada = !t.done && new Date(t.start) < new Date();
                  return (
                    <li key={t.id} className="flex gap-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tipo.color }} />
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", t.done ? "text-slate-600 line-through" : "text-slate-300")}>
                          {t.title}
                        </p>
                        <p className={cn("text-[11px]", atrasada ? "font-semibold text-danger" : "text-slate-500")}>
                          {tipo.label} ·{" "}
                          {new Date(t.start).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                          {atrasada && " · atrasada"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  href?: string;
}) {
  const conteudo = value?.trim() || "—";
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {icon} {label}
      </p>
      {href && value ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-sm text-brand-300 hover:underline">
          {conteudo}
        </a>
      ) : (
        <p className="text-sm text-slate-300">{conteudo}</p>
      )}
    </div>
  );
}

function Indicador({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: "grow" | "danger" | "warn";
}) {
  const cor = destaque === "grow" ? "text-grow-400" : destaque === "danger" ? "text-danger" : destaque === "warn" ? "text-warn" : "text-slate-200";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-sm font-semibold", cor)}>{valor}</span>
    </div>
  );
}
