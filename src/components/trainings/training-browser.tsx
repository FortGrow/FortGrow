"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { categoryColorMap } from "@/lib/trainings";
import { TrainingHero, TrainingShelf, type TrainingDTO } from "./training-shelf";

/**
 * Catálogo estilo Netflix: barra de evolução geral, hero em destaque e uma
 * prateleira por assunto — cores atribuídas por posição (sem tons repetidos).
 * Mantém o estado de "assistido" vivo quando o usuário marca no player.
 */
export function TrainingBrowser({ initial }: { initial: TrainingDTO[] }) {
  const [items, setItems] = useState(initial);

  function toggleWatched(id: string, watched: boolean) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, watched } : t)));
  }

  const categories = [...new Set(items.map((t) => t.category))];
  const colors = categoryColorMap(categories);
  const hero = items[0];
  const watchedCount = items.filter((t) => t.watched).length;
  const pct = items.length > 0 ? Math.round((watchedCount / items.length) * 100) : 0;

  return (
    <>
      {/* Barra de evolução geral */}
      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <PlayCircle size={18} className="text-brand-400" />
          <p className="text-sm font-bold text-slate-200">Sua evolução</p>
          <p className="text-xs text-slate-500">
            {watchedCount} de {items.length} vídeo{items.length > 1 ? "s" : ""} assistido{watchedCount === 1 ? "" : "s"} por completo
          </p>
          <p className="ml-auto text-lg font-bold text-brand-300">{pct}%</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-grow-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <TrainingHero
        t={items.find((t) => t.id === hero.id) ?? hero}
        color={colors[hero.category]}
        onToggleWatched={toggleWatched}
      />
      {categories.map((cat) => (
        <TrainingShelf
          key={cat}
          category={cat}
          color={colors[cat]}
          items={items.filter((t) => t.category === cat)}
          onToggleWatched={toggleWatched}
        />
      ))}
    </>
  );
}
