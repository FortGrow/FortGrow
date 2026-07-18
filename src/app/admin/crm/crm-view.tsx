"use client";

import { useState } from "react";
import { KanbanSquare, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban";
import { LeadCardGrid, type UnifiedLead } from "@/components/leads/lead-card-grid";

/**
 * CRM Comercial no padrão unificado da Prospecção: cards idênticos com a
 * etapa do funil colorindo o fundo. O Kanban clássico (arrastar entre
 * colunas) continua disponível como visão alternativa.
 */
export function CrmView({ leads, columns }: { leads: UnifiedLead[]; columns: KanbanColumn[] }) {
  const [view, setView] = useState<"cards" | "kanban">("cards");

  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
      active
        ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
        : "border-line text-slate-400 hover:border-line-strong hover:text-slate-200"
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setView("cards")} className={chip(view === "cards")}>
          <LayoutGrid size={13} /> Cards
        </button>
        <button onClick={() => setView("kanban")} className={chip(view === "kanban")}>
          <KanbanSquare size={13} /> Kanban
        </button>
      </div>

      {view === "cards" ? (
        <LeadCardGrid leads={leads} mode="crm" />
      ) : (
        <KanbanBoard columns={columns} endpoint="/api/leads" />
      )}
    </div>
  );
}
