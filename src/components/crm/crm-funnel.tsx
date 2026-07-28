"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Snowflake, ThermometerSun, User2 } from "lucide-react";
import { cn, brl } from "@/lib/utils";
import { hueOf } from "@/lib/glass";
import { agoLabel, daysSince } from "@/lib/crm";
import { crmPatch, type CrmScope } from "./api";
import type { LeadDto, StageDto } from "./types";

/**
 * Funil do CRM do cliente.
 *
 * Reaproveita a linguagem visual do quadro interno (coluna tingida pela cor
 * da etapa, `hueOf` clareando o rótulo), mas com o cartão de venda: valor,
 * responsável, temperatura, etiquetas e há quanto tempo ninguém encosta.
 *
 * Arrastar é otimista — o cartão muda de coluna na hora e a requisição vai
 * atrás. Se o servidor recusar, o estado volta e a mensagem aparece: numa
 * ferramenta de vendas, esperar a rede a cada movimento trava o ritmo de
 * quem está organizando o dia.
 */

const TEMP_ICON: Record<string, typeof Flame> = {
  QUENTE: Flame,
  MORNO: ThermometerSun,
  FRIO: Snowflake,
};
const TEMP_COLOR: Record<string, string> = {
  QUENTE: "#f43f5e",
  MORNO: "#f59e0b",
  FRIO: "#38bdf8",
};

function colStyles(accent: string, ativa: boolean) {
  const claro = `hsl(${hueOf(accent)})`;
  return {
    coluna: {
      background: `linear-gradient(180deg, ${accent}26, ${accent}0d 18%, rgba(11,14,20,0.6) 55%)`,
      borderColor: ativa ? claro : `${accent}59`,
      boxShadow: ativa ? `0 0 0 1px ${claro}, 0 18px 44px -26px ${accent}` : undefined,
    } as React.CSSProperties,
    cabecalho: { borderBottom: `1px solid ${accent}40` } as React.CSSProperties,
    rotulo: { color: claro } as React.CSSProperties,
    contador: {
      background: `${accent}2e`,
      color: claro,
      boxShadow: `inset 0 0 0 1px ${accent}59`,
    } as React.CSSProperties,
    vazio: { borderColor: `${accent}40` } as React.CSSProperties,
  };
}

export function CrmFunnel({
  stages,
  leads: iniciais,
  scope,
  basePath,
  readOnly = false,
}: {
  stages: StageDto[];
  leads: LeadDto[];
  scope: CrmScope;
  /** Prefixo das rotas de detalhe ("/portal/crm" ou "/admin/crm-clientes/<id>") */
  basePath: string;
  readOnly?: boolean;
}) {
  const [leads, setLeads] = useState(iniciais);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const porEtapa = useMemo(() => {
    const map = new Map<string, LeadDto[]>();
    for (const s of stages) map.set(s.id, []);
    for (const l of leads) map.get(l.stageId)?.push(l);
    return map;
  }, [leads, stages]);

  async function mover(leadId: string, stageId: string) {
    const anterior = leads;
    const etapa = stages.find((s) => s.id === stageId);
    if (!etapa) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stageId, stageName: etapa.name, stageColor: etapa.color, stageKind: etapa.kind }
          : l
      )
    );
    setErro(null);
    try {
      await crmPatch("/api/crm/leads", { id: leadId, stageId }, scope);
      // Recarrega para trazer score/valores recalculados pelo servidor
      router.refresh();
    } catch (e) {
      setLeads(anterior);
      setErro(e instanceof Error ? e.message : "Não foi possível mover o lead.");
    }
  }

  return (
    <div className="space-y-3">
      {erro && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
          {erro}
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((col) => {
          const cards = porEtapa.get(col.id) ?? [];
          const st = colStyles(col.color, overCol === col.id);
          const total = cards.reduce((s, l) => s + l.estimatedValue, 0);

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setOverCol(null);
                setDragging(null);
                if (id && !readOnly) mover(id, col.id);
              }}
              style={st.coluna}
              className="flex w-[17.5rem] shrink-0 flex-col rounded-2xl border transition-[border-color,box-shadow] duration-200"
            >
              <div className="px-4 py-3" style={st.cabecalho}>
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                    <p className="truncate text-xs font-bold uppercase tracking-wider" style={st.rotulo}>
                      {col.name}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={st.contador}>
                    {cards.length}
                  </span>
                </div>
                {total > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{brl(total)} em jogo</p>
                )}
              </div>

              <div className="flex-1 space-y-2 px-3 pb-3">
                {cards.map((lead) => (
                  <CardLead
                    key={lead.id}
                    lead={lead}
                    href={`${basePath}/leads/${lead.id}`}
                    draggable={!readOnly}
                    arrastando={dragging === lead.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", lead.id);
                      setDragging(lead.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                  />
                ))}
                {cards.length === 0 && (
                  <div
                    className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-slate-500"
                    style={st.vazio}
                  >
                    {readOnly ? "Nenhum lead" : "Arraste leads para cá"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardLead({
  lead,
  href,
  draggable,
  arrastando,
  onDragStart,
  onDragEnd,
}: {
  lead: LeadDto;
  href: string;
  draggable: boolean;
  arrastando: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const dias = daysSince(lead.lastContactAt ?? lead.createdAt);
  const parado = dias !== null && dias > 7 && lead.stageKind === "ABERTO";
  const Icone = TEMP_ICON[lead.temperature] ?? ThermometerSun;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-xl border border-line bg-ink-850 p-3 shadow-card transition hover:border-line-strong",
        draggable && "cursor-grab active:cursor-grabbing",
        arrastando && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200 transition group-hover:text-brand-300">
            {lead.name}
          </p>
          {lead.company && <p className="truncate text-xs text-slate-500">{lead.company}</p>}
        </Link>
        <span
          title={`${lead.temperature.toLowerCase()} · score ${lead.score}`}
          className="mt-0.5 shrink-0"
          style={{ color: TEMP_COLOR[lead.temperature] }}
        >
          <Icone size={13} />
        </span>
      </div>

      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: `${t.color}26`, color: t.color }}
            >
              {t.name}
            </span>
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[9px] font-semibold text-slate-600">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-slate-500">
          {lead.ownerName ? (
            <span className="inline-flex items-center gap-1">
              <User2 size={10} /> {lead.ownerName.split(" ")[0]}
            </span>
          ) : (
            <span className={cn(parado && "text-warn")}>{agoLabel(dias)}</span>
          )}
        </span>
        {lead.estimatedValue > 0 && (
          <span className="shrink-0 text-[11px] font-bold text-slate-300">{brl(lead.estimatedValue)}</span>
        )}
      </div>

      {parado && lead.ownerName && (
        <p className="mt-1 text-[10px] font-medium text-warn">sem contato {agoLabel(dias)}</p>
      )}
    </div>
  );
}
