"use client";

import { useState } from "react";
import { TrainingHero, TrainingShelf, type TrainingDTO } from "./training-shelf";

/**
 * Catálogo estilo Netflix: hero em destaque + uma prateleira por assunto,
 * cada assunto com a própria cor. Mantém o estado de "assistido" vivo na
 * tela quando o usuário marca/desmarca no player.
 */
export function TrainingBrowser({ initial }: { initial: TrainingDTO[] }) {
  const [items, setItems] = useState(initial);

  function toggleWatched(id: string, watched: boolean) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, watched } : t)));
  }

  const categories = [...new Set(items.map((t) => t.category))];
  const hero = items[0];

  return (
    <>
      <TrainingHero t={items.find((t) => t.id === hero.id) ?? hero} onToggleWatched={toggleWatched} />
      {categories.map((cat) => (
        <TrainingShelf
          key={cat}
          category={cat}
          items={items.filter((t) => t.category === cat)}
          onToggleWatched={toggleWatched}
        />
      ))}
    </>
  );
}
