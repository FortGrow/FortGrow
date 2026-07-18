"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { EVENT_TYPES, EVENT_STATUS_LABELS, RECURRENCE_LABELS } from "@/lib/agenda";

export type EventDto = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start: string;
  end: string;
  private: boolean;
  recurrence: string;
  recurrenceUntil: string | null;
  seriesStart: string;
  seriesEnd: string;
  attendeeIds: string[];
  clientId: string | null;
  clientName: string | null;
  createdById: string | null;
  createdByName: string | null;
};

type Person = { id: string; name: string };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h–21h

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
const hm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const toLocalInput = (d: Date) =>
  `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Formulário de evento (criação/edição). */
function EventForm({
  initial,
  defaults,
  users,
  clients,
  canDelete,
  onClose,
  onSaved,
}: {
  initial?: EventDto;
  defaults?: { start: Date; end: Date };
  users: Person[];
  clients: Person[];
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [attendees, setAttendees] = useState<string[]>(initial?.attendeeIds ?? []);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = initial ? new Date(initial.seriesStart ?? initial.start) : defaults?.start ?? new Date();
  const end = initial ? new Date(initial.seriesEnd ?? initial.end) : defaults?.end ?? new Date(Date.now() + 3600000);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      ...(initial ? { id: initial.id } : {}),
      title: form.get("title"),
      description: form.get("description"),
      type: form.get("type"),
      status: form.get("status"),
      start: new Date(String(form.get("start"))).toISOString(),
      end: new Date(String(form.get("end"))).toISOString(),
      clientId: form.get("clientId"),
      private: form.get("private") === "on",
      recurrence: form.get("recurrence"),
      recurrenceUntil: form.get("recurrenceUntil"),
      attendeeIds: attendees,
    };
    try {
      const res = await fetch("/api/events", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      onSaved();
      setTimeout(onClose, 700);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(initial!.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível excluir.");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay>
      <form onSubmit={onSubmit} className="card w-full max-w-xl animate-fade-up p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">{initial ? "Editar evento" : "Novo evento"}</h2>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="ev-title">Título *</label>
            <input id="ev-title" name="title" required defaultValue={initial?.title} className="input" placeholder="ex.: Reunião de resultados — Solaris" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ev-type">Tipo</label>
              <select id="ev-type" name="type" defaultValue={initial?.type ?? "REUNIAO_CLIENTE"} className="input">
                {Object.entries(EVENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ev-status">Status</label>
              <select id="ev-status" name="status" defaultValue={initial?.status ?? "CONFIRMADO"} className="input">
                {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ev-start">Início *</label>
              <input id="ev-start" name="start" type="datetime-local" required defaultValue={toLocalInput(start)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ev-end">Término *</label>
              <input id="ev-end" name="end" type="datetime-local" required defaultValue={toLocalInput(end)} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ev-client">Cliente vinculado (opcional)</label>
            <select id="ev-client" name="clientId" defaultValue={initial?.clientId ?? ""} className="input">
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ev-rec">Repetir</label>
              <select id="ev-rec" name="recurrence" defaultValue={initial?.recurrence ?? "NENHUMA"} className="input">
                {Object.entries(RECURRENCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ev-rec-until">Repetir até (opcional)</label>
              <input
                id="ev-rec-until"
                name="recurrenceUntil"
                type="date"
                defaultValue={initial?.recurrenceUntil?.slice(0, 10) ?? ""}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Participantes</label>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-xl border border-line p-2.5">
              {users.map((u) => (
                <label key={u.id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={attendees.includes(u.id)}
                    onChange={() =>
                      setAttendees((prev) => (prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]))
                    }
                    className="h-3.5 w-3.5 accent-sky-500"
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ev-desc">Descrição</label>
            <textarea id="ev-desc" name="description" rows={2} defaultValue={initial?.description ?? ""} className="input" />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-400">
            <input type="checkbox" name="private" defaultChecked={initial?.private} className="h-3.5 w-3.5 accent-sky-500" />
            Evento privado (visível só para você, participantes e admins)
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          {initial && canDelete ? (
            confirmDelete ? (
              <button type="button" onClick={onDelete} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-3 py-2 text-xs font-bold text-white transition hover:bg-danger/80 disabled:opacity-40">
                <Trash2 size={13} /> Confirmar exclusão?
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-danger/10 hover:text-danger">
                <Trash2 size={13} /> Excluir
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-grow-400">
                <CheckCircle2 size={15} /> Salvo!
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

/** Calendário da Agenda: visão mensal/semanal/diária com filtros e drag & drop. */
export function AgendaCalendar({
  me,
  users,
  clients,
  canEdit,
  canDelete,
  icsUrl,
}: {
  me: string;
  users: Person[];
  clients: Person[];
  canEdit: boolean;
  canDelete: boolean;
  icsUrl: string;
}) {
  const [view, setView] = useState<"mes" | "semana" | "dia">("mes");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<EventDto[]>([]);
  const [filters, setFilters] = useState({ colaborador: "", tipo: "", cliente: "" });
  const [editing, setEditing] = useState<EventDto | null>(null);
  const [creating, setCreating] = useState<{ start: Date; end: Date } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const range = useMemo(() => {
    const de = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const ate = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1);
    return { de, ate };
  }, [cursor]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ de: range.de.toISOString(), ate: range.ate.toISOString() });
    if (filters.colaborador) qs.set("colaborador", filters.colaborador);
    if (filters.tipo) qs.set("tipo", filters.tipo);
    if (filters.cliente) qs.set("cliente", filters.cliente);
    const res = await fetch(`/api/events?${qs}`);
    if (res.ok) setEvents((await res.json()).events);
  }, [range, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventsOf = (d: Date) => events.filter((e) => sameDay(new Date(e.start), d));

  async function moveEvent(id: string, toDay: Date) {
    const ev = events.find((e) => e.id === id);
    if (!ev || ev.recurrence !== "NENHUMA") return;
    const start = new Date(ev.start);
    const duration = new Date(ev.end).getTime() - start.getTime();
    const newStart = new Date(toDay);
    newStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
    if (sameDay(newStart, start)) return;
    const newEnd = new Date(newStart.getTime() + duration);
    // Otimista
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() } : e))
    );
    await fetch("/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, start: newStart.toISOString(), end: newEnd.toISOString() }),
    });
    void load();
  }

  function quickCreate(day: Date, hour?: number) {
    if (!canEdit) return;
    const start = new Date(day);
    start.setHours(hour ?? 9, 0, 0, 0);
    const end = new Date(start.getTime() + 3600000);
    setCreating({ start, end });
  }

  // ── Navegação ──────────────────────────────────────────────────────
  function shift(dir: 1 | -1) {
    const d = new Date(cursor);
    if (view === "mes") d.setMonth(d.getMonth() + dir);
    else if (view === "semana") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  }

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Dias exibidos
  const days = useMemo(() => {
    if (view === "dia") return [new Date(cursor)];
    if (view === "semana") {
      const start = new Date(cursor);
      start.setDate(start.getDate() - start.getDay());
      return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor, view]);

  const today = new Date();

  const chip = (e: EventDto, withTime = true) => {
    const t = EVENT_TYPES[e.type];
    return (
      <button
        key={e.id}
        draggable={canEdit && view === "mes" && e.recurrence === "NENHUMA"}
        onDragStart={(ev) => {
          ev.dataTransfer.setData("text/plain", e.id);
          setDragId(e.id);
        }}
        onDragEnd={() => setDragId(null)}
        onClick={(ev) => {
          ev.stopPropagation();
          setEditing(e);
        }}
        title={`${e.title}${e.clientName ? ` · ${e.clientName}` : ""}`}
        className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition hover:brightness-110 ${
          e.status === "CANCELADO" ? "line-through opacity-40" : e.status === "PENDENTE" ? "opacity-70" : ""
        } ${dragId === e.id ? "opacity-40" : ""}`}
        style={{ backgroundColor: `${t?.color ?? "#64748b"}cc` }}
      >
        {withTime && `${hm(new Date(e.start))} `}
        {e.private && "🔒 "}
        {e.recurrence !== "NENHUMA" && "↻ "}
        {e.title}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded-lg border border-line p-1.5 text-slate-400 hover:bg-ink-800"><ChevronLeft size={15} /></button>
          <button onClick={() => setCursor(new Date())} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-ink-800">Hoje</button>
          <button onClick={() => shift(1)} className="rounded-lg border border-line p-1.5 text-slate-400 hover:bg-ink-800"><ChevronRight size={15} /></button>
          <p className="ml-2 text-sm font-bold capitalize text-slate-200">
            {view === "dia" ? cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : monthLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line p-0.5">
            {(["dia", "semana", "mes"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${view === v ? "bg-brand-500/15 text-brand-300" : "text-slate-500 hover:text-slate-300"}`}
              >
                {v === "mes" ? "Mês" : v}
              </button>
            ))}
          </div>
          <button onClick={() => setGoogleOpen(true)} className="btn-ghost py-1.5 text-xs">
            <Link2 size={13} /> Google Agenda
          </button>
          {canEdit && (
            <button onClick={() => quickCreate(cursor)} className="btn-primary py-1.5 text-xs">
              <CalendarPlus size={13} /> Novo evento
            </button>
          )}
        </div>
      </div>

      {/* Filtros + legenda */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.colaborador} onChange={(e) => setFilters((f) => ({ ...f, colaborador: e.target.value }))} className="input w-auto py-1.5 text-xs">
          <option value="">Toda a equipe</option>
          <option value={me}>Minha agenda</option>
          {users.filter((u) => u.id !== me).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={filters.tipo} onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))} className="input w-auto py-1.5 text-xs">
          <option value="">Todos os tipos</option>
          {Object.entries(EVENT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filters.cliente} onChange={(e) => setFilters((f) => ({ ...f, cliente: e.target.value }))} className="input w-auto py-1.5 text-xs">
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          {Object.values(EVENT_TYPES).map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} /> {t.label}
            </span>
          ))}
        </span>
      </div>

      {/* Mês */}
      {view === "mes" && (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const dayEvents = eventsOf(d);
              return (
                <div
                  key={i}
                  onClick={() => quickCreate(d)}
                  onDragOver={(e) => canEdit && e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) void moveEvent(id, d);
                  }}
                  className={`min-h-24 cursor-pointer space-y-1 border-b border-r border-line/60 p-1.5 transition hover:bg-ink-800/40 ${inMonth ? "" : "opacity-40"}`}
                >
                  <p className={`text-right text-[11px] font-semibold ${sameDay(d, today) ? "text-brand-300" : "text-slate-500"}`}>
                    {sameDay(d, today) ? <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5">{d.getDate()}</span> : d.getDate()}
                  </p>
                  {dayEvents.slice(0, 3).map((e) => chip(e))}
                  {dayEvents.length > 3 && (
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setCursor(d); setView("dia"); }}
                      className="text-[10px] font-semibold text-slate-500 hover:text-brand-300"
                    >
                      +{dayEvents.length - 3} mais
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Semana / Dia */}
      {view !== "mes" && (
        <div className="card overflow-x-auto p-0">
          <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(120px, 1fr))` }}>
            <div className="border-b border-line" />
            {days.map((d, i) => (
              <div key={i} className={`border-b border-l border-line/60 py-2 text-center text-xs font-bold ${sameDay(d, today) ? "text-brand-300" : "text-slate-400"}`}>
                {WEEKDAYS[d.getDay()]} {d.getDate()}
              </div>
            ))}
            {HOURS.map((h) => (
              <>
                <div key={`h-${h}`} className="border-b border-line/40 pr-2 pt-1 text-right text-[10px] text-slate-600">
                  {h}h
                </div>
                {days.map((d, i) => {
                  const slotEvents = eventsOf(d).filter((e) => new Date(e.start).getHours() === h);
                  return (
                    <div
                      key={`${h}-${i}`}
                      onClick={() => quickCreate(d, h)}
                      className="min-h-11 cursor-pointer space-y-0.5 border-b border-l border-line/40 p-0.5 transition hover:bg-ink-800/40"
                    >
                      {slotEvents.map((e) => chip(e))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      {creating && (
        <EventForm
          defaults={creating}
          users={users}
          clients={clients}
          canDelete={canDelete}
          onClose={() => setCreating(null)}
          onSaved={load}
        />
      )}
      {editing && (
        <EventForm
          initial={editing}
          users={users}
          clients={clients}
          canDelete={canDelete}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {googleOpen && (
        <Overlay>
          <div className="card w-full max-w-lg animate-fade-up p-6">
            <h2 className="mb-2 text-lg font-bold text-slate-100">Conectar ao Google Agenda</h2>
            <p className="mb-3 text-sm leading-relaxed text-slate-400">
              A agenda do CRM pode aparecer dentro do seu Google Agenda por assinatura (atualiza sozinha):
            </p>
            <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-400">
              <li>Abra o Google Agenda no computador</li>
              <li>Em <span className="font-semibold text-slate-300">Outras agendas</span>, clique em <span className="font-semibold text-slate-300">+</span> → <span className="font-semibold text-slate-300">A partir do URL</span></li>
              <li>Cole o link abaixo e confirme</li>
            </ol>
            <div className="flex items-center gap-2">
              <input readOnly value={icsUrl} className="input flex-1 text-xs" onFocus={(e) => e.currentTarget.select()} />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(icsUrl).catch(() => null);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-ghost py-2 text-xs"
              >
                <Copy size={13} /> {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Eventos privados não entram no feed. A sincronização bidirecional (criar no Google e aparecer aqui)
              exige credenciais OAuth do Google Cloud — a estrutura já está pronta para conectar quando quiser ativar.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setGoogleOpen(false)} className="btn-ghost">Fechar</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
