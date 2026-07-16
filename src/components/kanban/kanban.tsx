"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type KanbanCard = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeTone?: string;
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

/**
 * Quadro Kanban com drag & drop nativo.
 * Ao soltar um cartão, envia PATCH para `endpoint` com { id, stage }.
 */
export function KanbanBoard({ columns, endpoint }: { columns: KanbanColumn[]; endpoint: string }) {
  const [board, setBoard] = useState(columns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const router = useRouter();

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
                className={cn(
                  "cursor-grab rounded-xl border border-line bg-ink-850 p-3.5 shadow-card transition hover:border-line-strong active:cursor-grabbing",
                  dragging === card.id && "opacity-50"
                )}
              >
                <p className="text-sm font-semibold text-slate-200">{card.title}</p>
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
