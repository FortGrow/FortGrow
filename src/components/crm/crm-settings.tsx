"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { STAGE_KIND_LABELS, STAGE_KINDS } from "@/lib/crm";
import { crmDelete, crmPatch, crmPost, type CrmScope } from "./api";
import type { StageDto, TagDto } from "./types";

/**
 * Configuração do funil e das etiquetas.
 *
 * O `kind` de cada etapa (em aberto / ganho / perdido) é o que o painel usa
 * para saber o que é conversão e o que é receita — por isso ele fica
 * visível aqui, e não escondido: uma empresa que renomeie "Fechado" para
 * "Contrato assinado" precisa poder dizer que aquilo continua sendo ganho.
 */

const CORES = ["#64748b", "#0284c7", "#06b6d4", "#6366f1", "#8b5cf6", "#d97706", "#059669", "#e11d48"];

export function CrmSettings({
  stages,
  tags,
  scope,
  readOnly = false,
}: {
  stages: StageDto[];
  tags: TagDto[];
  scope: CrmScope;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PainelEtapas stages={stages} scope={scope} readOnly={readOnly} />
      <PainelEtiquetas tags={tags} scope={scope} readOnly={readOnly} />
    </div>
  );
}

function PainelEtapas({ stages, scope, readOnly }: { stages: StageDto[]; scope: CrmScope; readOnly: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<StageDto | null>(null);
  const [novo, setNovo] = useState("");
  const router = useRouter();

  async function salvar(id: string, campos: Record<string, unknown>) {
    setOcupado(id);
    setErro(null);
    try {
      await crmPatch("/api/crm/stages", { id, ...campos }, scope);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setOcupado(null);
    }
  }

  async function criar() {
    if (novo.trim().length < 2) return;
    setOcupado("novo");
    try {
      await crmPost("/api/crm/stages", { name: novo.trim() }, scope);
      setNovo("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar etapa.");
    } finally {
      setOcupado(null);
    }
  }

  /** Troca a posição com o vizinho — reordenação sem drag, que aqui basta. */
  async function mover(s: StageDto, direcao: -1 | 1) {
    const vizinho = stages[stages.indexOf(s) + direcao];
    if (!vizinho) return;
    setOcupado(s.id);
    try {
      await crmPatch("/api/crm/stages", { id: s.id, position: vizinho.position }, scope);
      await crmPatch("/api/crm/stages", { id: vizinho.id, position: s.position }, scope);
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold text-slate-300">Etapas do funil</h2>
      <p className="mb-4 mt-0.5 text-xs text-slate-500">
        A ordem aqui é a ordem das colunas no funil. O tipo diz ao painel o que conta como conversão.
      </p>

      {erro && <p className="mb-3 text-sm font-medium text-danger">{erro}</p>}

      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-850 p-2.5">
            {!readOnly && (
              <div className="flex flex-col">
                <button
                  onClick={() => mover(s, -1)}
                  disabled={i === 0 || ocupado === s.id}
                  className="text-slate-600 transition hover:text-slate-300 disabled:opacity-30"
                  title="Subir"
                >
                  ▲
                </button>
                <button
                  onClick={() => mover(s, 1)}
                  disabled={i === stages.length - 1 || ocupado === s.id}
                  className="text-slate-600 transition hover:text-slate-300 disabled:opacity-30"
                  title="Descer"
                >
                  ▼
                </button>
              </div>
            )}
            {readOnly && <GripVertical size={14} className="text-slate-700" />}

            <input
              defaultValue={s.name}
              disabled={readOnly}
              onBlur={(e) => e.target.value.trim() !== s.name && salvar(s.id, { name: e.target.value.trim() })}
              className="input min-w-[8rem] flex-1 py-1.5 text-sm"
            />

            <select
              defaultValue={s.kind}
              disabled={readOnly}
              onChange={(e) => salvar(s.id, { kind: e.target.value })}
              className="input w-32 py-1.5 text-xs"
            >
              {STAGE_KINDS.map((k) => (
                <option key={k} value={k}>{STAGE_KIND_LABELS[k]}</option>
              ))}
            </select>

            <div className="flex gap-1">
              {CORES.map((c) => (
                <button
                  key={c}
                  disabled={readOnly}
                  onClick={() => salvar(s.id, { color: c })}
                  className={cn("h-4 w-4 rounded-full transition hover:scale-125", s.color === c && "ring-2 ring-white/70")}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            {!readOnly && (
              <button
                onClick={() => setRemovendo(s)}
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                title="Excluir etapa"
              >
                <Trash2 size={13} />
              </button>
            )}
            {ocupado === s.id && <Loader2 size={13} className="animate-spin text-slate-500" />}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-3 flex gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            placeholder="Nome da nova etapa"
            className="input flex-1 py-2 text-sm"
          />
          <button onClick={criar} disabled={novo.trim().length < 2 || ocupado === "novo"} className="btn-ghost py-2 text-xs">
            {ocupado === "novo" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar
          </button>
        </div>
      )}

      {removendo && (
        <ConfirmaExclusaoEtapa
          stage={removendo}
          stages={stages}
          scope={scope}
          onClose={() => setRemovendo(null)}
        />
      )}
    </div>
  );
}

/**
 * Excluir etapa exige dizer para onde vão os leads dela. A API recusa sem
 * destino, então perguntar aqui evita o erro em vez de reagir a ele.
 */
function ConfirmaExclusaoEtapa({
  stage,
  stages,
  scope,
  onClose,
}: {
  stage: StageDto;
  stages: StageDto[];
  scope: CrmScope;
  onClose: () => void;
}) {
  const outras = stages.filter((s) => s.id !== stage.id);
  const [destino, setDestino] = useState(outras[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function excluir() {
    setLoading(true);
    setErro(null);
    try {
      await crmDelete("/api/crm/stages", { id: stage.id, moveTo: destino }, scope);
      onClose();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay>
      <div className="card w-full max-w-sm animate-fade-up p-6">
        <h2 className="text-lg font-bold text-slate-100">Excluir &quot;{stage.name}&quot;</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500">
          Os leads que estiverem nesta etapa vão para a etapa escolhida abaixo. Nenhum lead é apagado.
        </p>
        <label className="label" htmlFor="destino">Mover os leads para</label>
        <select id="destino" value={destino} onChange={(e) => setDestino(e.target.value)} className="input">
          {outras.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {erro && <p className="mt-3 text-sm font-medium text-danger">{erro}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={excluir} disabled={loading} className="btn-primary bg-danger hover:bg-danger/90">
            {loading && <Loader2 size={15} className="animate-spin" />} Excluir etapa
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function PainelEtiquetas({ tags, scope, readOnly }: { tags: TagDto[]; scope: CrmScope; readOnly: boolean }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES[1]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function criar() {
    if (nome.trim().length < 1) return;
    setOcupado(true);
    setErro(null);
    try {
      await crmPost("/api/crm/tags", { name: nome.trim(), color: cor }, scope);
      setNome("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar etiqueta.");
    } finally {
      setOcupado(false);
    }
  }

  async function remover(t: TagDto) {
    if (!confirm(`Excluir a etiqueta "${t.name}"? Ela sai dos leads que a usam.`)) return;
    try {
      await crmDelete("/api/crm/tags", { id: t.id }, scope);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir.");
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold text-slate-300">Etiquetas</h2>
      <p className="mb-4 mt-0.5 text-xs text-slate-500">
        Marcadores livres para classificar leads (segmento, campanha, prioridade) e filtrar depois.
      </p>

      {erro && <p className="mb-3 text-sm font-medium text-danger">{erro}</p>}

      {tags.length === 0 ? (
        <p className="text-xs text-slate-600">Nenhuma etiqueta criada.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t.id}
              className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: `${t.color}26`, color: t.color }}
            >
              {t.name}
              {typeof t.count === "number" && <span className="opacity-60">{t.count}</span>}
              {!readOnly && (
                <button onClick={() => remover(t)} className="opacity-0 transition group-hover:opacity-100" title="Excluir">
                  <Trash2 size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criar()}
              placeholder="Nome da etiqueta"
              maxLength={30}
              className="input flex-1 py-2 text-sm"
            />
            <button onClick={criar} disabled={!nome.trim() || ocupado} className="btn-ghost py-2 text-xs">
              {ocupado ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Criar
            </button>
          </div>
          <div className="flex gap-1.5">
            {CORES.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={cn("h-5 w-5 rounded-full transition hover:scale-110", cor === c && "ring-2 ring-white/70")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
