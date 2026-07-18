"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Play, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";

/* eslint-disable @next/next/no-img-element */
export type TrainingDTO = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  duration: string | null;
  publishedAt: string;
  /** O usuário logado já assistiu por completo? */
  watched: boolean;
};

function Thumb({ t, className }: { t: TrainingDTO; className?: string }) {
  return t.thumbnailUrl ? (
    <img src={t.thumbnailUrl} alt="" className={`${className} object-cover`} loading="lazy" />
  ) : (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-ink-700 via-ink-800 to-blue-950`}>
      <Play size={36} className="text-slate-600" />
    </div>
  );
}

/** Selo "Assistido" sobre a thumbnail. */
function WatchedBadge() {
  return (
    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-grow-500/90 px-2 py-0.5 text-[10px] font-bold text-ink-950 shadow">
      <CheckCircle2 size={11} /> Assistido
    </span>
  );
}

/** Player em modal com o vídeo incorporado + marcar como assistido. */
function PlayerModal({
  t,
  color,
  onClose,
  onToggleWatched,
}: {
  t: TrainingDTO;
  color: string;
  onClose: () => void;
  onToggleWatched: (id: string, watched: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !t.watched;
    try {
      const res = await fetch("/api/trainings/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingId: t.id, watched: next }),
      });
      if (res.ok) onToggleWatched(t.id, next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay>
      <div className="card w-full max-w-3xl animate-fade-up overflow-hidden p-0">
        <div className="relative aspect-video w-full bg-black">
          {t.embedUrl ? (
            <iframe
              src={`${t.embedUrl}?autoplay=1`}
              title={t.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Link de vídeo não reconhecido.
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 rounded-full bg-ink-950/80 p-2 text-white backdrop-blur transition hover:bg-danger"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">{t.title}</h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
              style={{ color, backgroundColor: `${color}1a`, borderColor: `${color}44`, boxShadow: `inset 0 0 0 1px ${color}44` }}
            >
              {t.category}
            </span>
            {t.duration && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} /> {t.duration}
              </span>
            )}
          </div>
          {t.description && <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.description}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              Publicado em {new Date(t.publishedAt).toLocaleDateString("pt-BR")}
            </p>
            <button
              onClick={toggle}
              disabled={busy}
              className={
                t.watched
                  ? "inline-flex items-center gap-1.5 rounded-xl bg-grow-500/15 px-4 py-2 text-sm font-semibold text-grow-400 ring-1 ring-inset ring-grow-500/40 transition hover:bg-grow-500/25 disabled:opacity-60"
                  : "btn-primary !py-2 text-sm disabled:opacity-60"
              }
            >
              <CheckCircle2 size={15} />
              {t.watched ? "Assistido por completo · desmarcar" : "Marcar como assistido"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/** Banner hero estilo Netflix com o treinamento em destaque. */
export function TrainingHero({
  t,
  color,
  onToggleWatched,
}: {
  t: TrainingDTO;
  color: string;
  onToggleWatched: (id: string, watched: boolean) => void;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <div className="group relative mb-8 h-64 cursor-pointer overflow-hidden rounded-2xl sm:h-80" onClick={() => setPlaying(true)}>
        <Thumb t={t} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
        {t.watched && <WatchedBadge />}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset backdrop-blur"
            style={{ color, backgroundColor: `${color}26`, boxShadow: `inset 0 0 0 1px ${color}55` }}
          >
            Em destaque · {t.category}
          </span>
          <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight text-white sm:text-3xl">{t.title}</h2>
          {t.description && <p className="mt-2 max-w-xl text-sm text-slate-300 line-clamp-2">{t.description}</p>}
          <button className="btn-primary mt-4">
            <Play size={15} /> Assistir agora
          </button>
        </div>
      </div>
      {playing && <PlayerModal t={t} color={color} onClose={() => setPlaying(false)} onToggleWatched={onToggleWatched} />}
    </>
  );
}

/** Trilho horizontal por assunto — cor própria da categoria em cada card. */
export function TrainingShelf({
  category,
  color,
  items,
  onToggleWatched,
}: {
  category: string;
  color: string;
  items: TrainingDTO[];
  onToggleWatched: (id: string, watched: boolean) => void;
}) {
  const [playing, setPlaying] = useState<TrainingDTO | null>(null);
  const watchedCount = items.filter((t) => t.watched).length;
  const pct = items.length > 0 ? Math.round((watchedCount / items.length) * 100) : 0;
  // O modal precisa do item VIVO (props atualizadas), não da cópia salva no clique —
  // senão o botão "marcar como assistido" não reflete a mudança.
  const live = playing ? items.find((i) => i.id === playing.id) ?? playing : null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
          {category}
        </h2>
        <span className="text-xs text-slate-600">
          {watchedCount}/{items.length} assistido{items.length > 1 ? "s" : ""}
        </span>
        <span className="h-1.5 w-28 overflow-hidden rounded-full bg-ink-800">
          <span
            className="block h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </span>
        <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3">
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => setPlaying(t)}
            className="group w-64 shrink-0 text-left transition duration-300 hover:z-10 hover:scale-[1.06]"
          >
            <div
              className="relative aspect-video overflow-hidden rounded-xl transition"
              style={{
                boxShadow: t.watched ? `0 0 0 2px ${color}` : `0 0 0 1px ${color}55`,
              }}
            >
              <Thumb t={t} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-110" />
              {/* véu com a cor do assunto na base do card */}
              <div
                className="absolute inset-x-0 bottom-0 h-1/3"
                style={{ background: `linear-gradient(to top, ${color}59, transparent)` }}
              />
              {t.watched && <WatchedBadge />}
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/0 opacity-0 transition group-hover:bg-ink-950/40 group-hover:opacity-100">
                <span className="rounded-full p-3 text-ink-950 shadow-glow" style={{ backgroundColor: color }}>
                  <Play size={18} />
                </span>
              </div>
              {t.duration && (
                <span className="absolute bottom-2 right-2 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur">
                  {t.duration}
                </span>
              )}
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-slate-200 group-hover:text-white">{t.title}</p>
            <p className="truncate text-xs" style={{ color: `${color}cc` }}>
              {t.category}
              {t.description ? <span className="text-slate-500"> · {t.description}</span> : null}
            </p>
          </button>
        ))}
      </div>
      {live && <PlayerModal t={live} color={color} onClose={() => setPlaying(null)} onToggleWatched={onToggleWatched} />}
    </div>
  );
}
