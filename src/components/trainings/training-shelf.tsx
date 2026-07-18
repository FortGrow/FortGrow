"use client";

import { useState } from "react";
import { Clock, Play, X } from "lucide-react";
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

/** Player em modal com o vídeo incorporado. */
function PlayerModal({ t, onClose }: { t: TrainingDTO; onClose: () => void }) {
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
            <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-400 ring-1 ring-inset ring-brand-500/20">
              {t.category}
            </span>
            {t.duration && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} /> {t.duration}
              </span>
            )}
          </div>
          {t.description && <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.description}</p>}
          <p className="mt-2 text-xs text-slate-600">
            Publicado em {new Date(t.publishedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </Overlay>
  );
}

/** Banner hero estilo Netflix com o treinamento em destaque. */
export function TrainingHero({ t }: { t: TrainingDTO }) {
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <div className="group relative mb-8 h-64 cursor-pointer overflow-hidden rounded-2xl sm:h-80" onClick={() => setPlaying(true)}>
        <Thumb t={t} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="rounded-full bg-brand-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-300 ring-1 ring-inset ring-brand-500/30 backdrop-blur">
            Em destaque · {t.category}
          </span>
          <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight text-white sm:text-3xl">{t.title}</h2>
          {t.description && <p className="mt-2 max-w-xl text-sm text-slate-300 line-clamp-2">{t.description}</p>}
          <button className="btn-primary mt-4">
            <Play size={15} /> Assistir agora
          </button>
        </div>
      </div>
      {playing && <PlayerModal t={t} onClose={() => setPlaying(false)} />}
    </>
  );
}

/** Trilho horizontal de treinamentos por categoria, com hover animado. */
export function TrainingShelf({ category, items }: { category: string; items: TrainingDTO[] }) {
  const [playing, setPlaying] = useState<TrainingDTO | null>(null);
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">{category}</h2>
      <div className="flex gap-4 overflow-x-auto pb-3">
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => setPlaying(t)}
            className="group w-64 shrink-0 text-left transition duration-300 hover:z-10 hover:scale-[1.06]"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-line transition group-hover:shadow-glow group-hover:ring-brand-500/50">
              <Thumb t={t} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/0 opacity-0 transition group-hover:bg-ink-950/40 group-hover:opacity-100">
                <span className="rounded-full bg-brand-500 p-3 text-ink-950 shadow-glow">
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
            {t.description && <p className="truncate text-xs text-slate-500">{t.description}</p>}
          </button>
        ))}
      </div>
      {playing && <PlayerModal t={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
