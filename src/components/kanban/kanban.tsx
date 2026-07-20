"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type KanbanCard = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeTone?: string;
  /// Chave da paleta de cores do cartão (CARD_COLORS)
  color?: string | null;
};

export type KanbanColumn = {
  key: string;
  label: string;
  cards: KanbanCard[];
  accent?: string;
};

const TONES: Record<string, string> = {
  slate: "bg-slate-500/10 text-slate-400",
  brand: "bg-brand-500/10 text-brand-400",
  grow: "bg-grow-500/10 text-grow-400",
  warn: "bg-warn/10 text-warn",
  danger: "bg-danger/10 text-danger",
  violet: "bg-violet/10 text-violet",
};

/** Paleta de cores dos cartões — tons validados para o tema escuro. */
export const CARD_COLORS: Record<string, string> = {
  azul: "#0284c7",
  verde: "#059669",
  roxo: "#8b5cf6",
  laranja: "#d97706",
  rosa: "#ec4899",
  vermelho: "#dc2626",
  ciano: "#06b6d4",
  amarelo: "#eab308",
};

function cardStyle(color?: string | null): React.CSSProperties | undefined {
  const hex = color ? CARD_COLORS[color] : undefined;
  if (!hex) return undefined;
  return { borderColor: `${hex}66`, background: `${hex}14`, borderLeft: `3px solid ${hex}` };
}

/**
 * Quadro Kanban com drag & drop nativo.
 * Ao soltar um cartão, envia PATCH para `endpoint` com { id, stage }.
 * Com `colorable`, cada cartão ganha uma paleta de cores (PATCH { id, color }).
 */
export function KanbanBoard({
  columns,
  endpoint,
  colorable = false,
  onEdit,
}: {
  columns: KanbanColumn[];
  endpoint: string;
  colorable?: boolean;
  /// Quando definido, cada cartão ganha um botão de edição (lápis)
  onEdit?: (cardId: string) => void;
}) {
  const [board, setBoard] = useState(columns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  const router = useRouter();

  // Re-sincroniza quando o pai manda novas colunas (ex.: filtro por responsável)
  useEffect(() => setBoard(columns), [columns]);

  async function moveCard(cardId: string, toCol: string) {
    const fromCol = board.find((c) => c.cards.some((k) => k.id === cardId));
    if (!fromCol || fromCol.key === toCol) return;
    const card = fromCol.cards.find((k) => k.id === cardId)!;

    // Atualização otimista
    setBoard((prev) =>
      prev.map((col) => {
        if (col.key === fromCol.key) return { ...col, cards: col.cards.filter((k) => k.id !== cardId) };
        if (col.key === toCol) return { ...col, cards: [card, ...col.cards] };
        return col;
      })
    );

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cardId, stage: toCol }),
    });
    if (!res.ok) router.refresh();
  }

  async function paintCard(cardId: string, color: string | null) {
    setPaletteFor(null);
    // Atualização otimista
    setBoard((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((k) => (k.id === cardId ? { ...k, color } : k)),
      }))
    );
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cardId, color: color ?? "" }),
    });
    if (!res.ok) router.refresh();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {board.map((col) => (
        <div
          key={col.key}
          onDragOver={(e) => {
            e.preventDefault();
            setOverCol(col.key);
          }}
          onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            setOverCol(null);
            setDragging(null);
            if (id) moveCard(id, col.key);
          }}
          className={cn(
            "flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-ink-900/60 transition",
            overCol === col.key && "border-brand-500/40 bg-brand-500/5"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.accent ?? "#64748b" }} />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{col.label}</p>
            </div>
            <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
              {col.cards.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 px-3 pb-3">
            {col.cards.map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", card.id);
                  setDragging(card.id);
                }}
                onDragEnd={() => setDragging(null)}
                style={cardStyle(card.color)}
                className={cn(
                  "group cursor-grab rounded-xl border border-line bg-ink-850 p-3.5 shadow-card transition hover:border-line-strong active:cursor-grabbing",
                  dragging === card.id && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-200">{card.title}</p>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                    {onEdit && (
                      <button
                        type="button"
                        title="Editar tarefa"
                        onClick={() => onEdit(card.id)}
                        className="rounded p-0.5 text-slate-600 opacity-60 transition hover:bg-ink-700 hover:text-brand-300 group-hover:opacity-100"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                    )}
                    {colorable && (
                      <button
                        type="button"
                        title="Cor do cartão"
                        onClick={() => setPaletteFor((p) => (p === card.id ? null : card.id))}
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-line transition group-hover:scale-110"
                        style={{ backgroundColor: card.color ? CARD_COLORS[card.color] ?? "#334155" : "#334155" }}
                      />
                    )}
                  </span>
                </div>
                {colorable && paletteFor === card.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-ink-900/80 p-2">
                    {Object.entries(CARD_COLORS).map(([key, hex]) => (
                      <button
                        key={key}
                        type="button"
                        title={key}
                        onClick={() => paintCard(card.id, key)}
                        className={cn(
                          "h-4 w-4 rounded-full transition hover:scale-125",
                          card.color === key && "ring-2 ring-white/70"
                        )}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <button
                      type="button"
                      title="Sem cor"
                      onClick={() => paintCard(card.id, null)}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-[9px] font-bold text-slate-400 transition hover:scale-125"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {card.subtitle && <p className="mt-0.5 text-xs text-slate-500">{card.subtitle}</p>}
                <div className="mt-2.5 flex items-center justify-between">
                  {card.badge ? (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TONES[card.badgeTone ?? "slate"])}>
                      {card.badge}
                    </span>
                  ) : (
                    <span />
                  )}
                  {card.meta && <span className="text-[11px] font-medium text-slate-500">{card.meta}</span>}
                </div>
              </div>
            ))}
            {col.cards.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-slate-600">
                Arraste cartões para cá
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
