"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download, FileSpreadsheet, FileText, Filter, Loader2, Search, Trash2, Upload, X,
} from "lucide-react";
import { brl, cn } from "@/lib/utils";
import { agoLabel, daysSince, TEMPERATURES } from "@/lib/crm";
import { crmDelete, crmGet, exportUrl, type CrmScope } from "./api";
import { CrmLeadForm } from "./crm-lead-form";
import { CrmImport } from "./crm-import";
import type { LeadDto, MemberDto, StageDto, TagDto } from "./types";

/**
 * Lista de leads: busca instantânea, filtros combináveis, paginação e
 * exportação.
 *
 * A busca é feita no servidor (índices por clientId) e não em memória —
 * uma empresa com dez mil leads não pode baixar tudo para filtrar no
 * navegador. O campo de texto espera 350 ms de silêncio antes de disparar,
 * então digitar uma palavra gera uma requisição, não sete.
 */

type Resposta = { rows: RowApi[]; total: number; page: number; pages: number };

type RowApi = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  estimatedValue: string | number;
  score: number;
  temperature: string;
  createdAt: string;
  lastContactAt: string | null;
  nextContactAt: string | null;
  stage: { id: string; name: string; color: string; kind: string };
  owner: { id: string; name: string } | null;
  tags: TagDto[];
};

const VAZIO = {
  q: "", stageId: "", ownerId: "", source: "", state: "", tagId: "", temperature: "", from: "", to: "",
};

export function CrmLeadsView({
  stages,
  members,
  tags,
  sources,
  scope,
  basePath,
  readOnly = false,
}: {
  stages: StageDto[];
  members: MemberDto[];
  tags: TagDto[];
  sources: string[];
  scope: CrmScope;
  basePath: string;
  readOnly?: boolean;
}) {
  const [filtros, setFiltros] = useState({ ...VAZIO });
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [avancado, setAvancado] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const router = useRouter();

  // Debounce da busca: o filtro só muda depois que a digitação para
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.q === busca ? f : { ...f, q: busca }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  // Descarta respostas fora de ordem: com busca rápida, a resposta antiga
  // pode chegar depois da nova e sobrescrever o resultado certo
  const seq = useRef(0);
  useEffect(() => {
    const meu = ++seq.current;
    setCarregando(true);
    const qs = new URLSearchParams({ page: String(page), per: "25" });
    for (const [k, v] of Object.entries(filtros)) if (v) qs.set(k, v);

    crmGet<Resposta>(`/api/crm/leads?${qs}`, scope)
      .then((r) => {
        if (meu === seq.current) {
          setDados(r);
          setErro(null);
        }
      })
      .catch((e) => meu === seq.current && setErro(e.message))
      .finally(() => meu === seq.current && setCarregando(false));
  }, [filtros, page, scope]);

  const ativos = useMemo(
    () => Object.entries(filtros).filter(([k, v]) => v && k !== "q").length,
    [filtros]
  );

  async function excluir(id: string, nome: string) {
    if (!confirm(`Mover "${nome}" para a lixeira?`)) return;
    setExcluindo(id);
    try {
      await crmDelete("/api/crm/leads", { id }, scope);
      setDados((d) => (d ? { ...d, rows: d.rows.filter((r) => r.id !== id), total: d.total - 1 } : d));
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setExcluindo(null);
    }
  }

  const limpar = () => {
    setFiltros({ ...VAZIO });
    setBusca("");
    setPage(1);
  };

  const filtrosExport = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));

  return (
    <div className="space-y-4">
      {/* ── Barra de busca e ações ── */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[15rem] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, empresa, e-mail, telefone, cidade…"
            className="input py-2 pl-9"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setAvancado((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
            avancado || ativos
              ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
              : "border-line text-slate-400 hover:text-slate-200"
          )}
        >
          <Filter size={13} /> Filtros {ativos > 0 && `(${ativos})`}
        </button>

        <div className="flex items-center gap-1.5">
          <a href={exportUrl("csv", filtrosExport, scope)} className="btn-ghost py-2 text-xs" title="Exportar CSV">
            <Download size={13} /> CSV
          </a>
          <a href={exportUrl("xlsx", filtrosExport, scope)} className="btn-ghost py-2 text-xs" title="Exportar Excel">
            <FileSpreadsheet size={13} /> Excel
          </a>
          <a href={exportUrl("pdf", filtrosExport, scope)} className="btn-ghost py-2 text-xs" title="Exportar PDF">
            <FileText size={13} /> PDF
          </a>
        </div>

        {!readOnly && (
          <>
            <CrmImport
              stages={stages}
              scope={scope}
              trigger={
                <button className="btn-ghost py-2 text-xs">
                  <Upload size={13} /> Importar
                </button>
              }
            />
            <CrmLeadForm stages={stages} members={members} tags={tags} scope={scope} />
          </>
        )}
      </div>

      {avancado && (
        <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Selecao
            label="Etapa"
            value={filtros.stageId}
            onChange={(v) => { setFiltros((f) => ({ ...f, stageId: v })); setPage(1); }}
            options={stages.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Selecao
            label="Responsável"
            value={filtros.ownerId}
            onChange={(v) => { setFiltros((f) => ({ ...f, ownerId: v })); setPage(1); }}
            options={[{ value: "SEM", label: "Sem responsável" }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
          />
          <Selecao
            label="Origem"
            value={filtros.source}
            onChange={(v) => { setFiltros((f) => ({ ...f, source: v })); setPage(1); }}
            options={sources.map((s) => ({ value: s, label: s }))}
          />
          <Selecao
            label="Etiqueta"
            value={filtros.tagId}
            onChange={(v) => { setFiltros((f) => ({ ...f, tagId: v })); setPage(1); }}
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Selecao
            label="Temperatura"
            value={filtros.temperature}
            onChange={(v) => { setFiltros((f) => ({ ...f, temperature: v })); setPage(1); }}
            options={Object.entries(TEMPERATURES).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <div>
            <label className="label" htmlFor="fl-uf">Estado (UF)</label>
            <input
              id="fl-uf"
              value={filtros.state}
              maxLength={2}
              onChange={(e) => { setFiltros((f) => ({ ...f, state: e.target.value.toUpperCase() })); setPage(1); }}
              className="input py-2"
              placeholder="SP"
            />
          </div>
          <div>
            <label className="label" htmlFor="fl-de">Criado de</label>
            <input
              id="fl-de"
              type="date"
              value={filtros.from}
              onChange={(e) => { setFiltros((f) => ({ ...f, from: e.target.value })); setPage(1); }}
              className="input py-2"
            />
          </div>
          <div>
            <label className="label" htmlFor="fl-ate">até</label>
            <input
              id="fl-ate"
              type="date"
              value={filtros.to}
              onChange={(e) => { setFiltros((f) => ({ ...f, to: e.target.value })); setPage(1); }}
              className="input py-2"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button onClick={limpar} className="btn-ghost py-2 text-xs">Limpar filtros</button>
          </div>
        </div>
      )}

      {erro && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
          {erro}
        </p>
      )}

      {/* ── Tabela ── */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">Etapa</th>
              <th className="px-4 py-3 font-semibold">Responsável</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              {!readOnly && <th className="px-4 py-3 font-semibold" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {carregando && !dados && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {dados?.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhum lead encontrado com esses filtros.
                </td>
              </tr>
            )}
            {dados?.rows.map((l) => {
              const dias = daysSince(l.lastContactAt ?? l.createdAt);
              const temp = TEMPERATURES[l.temperature];
              return (
                <tr key={l.id} className="transition hover:bg-ink-800/50">
                  <td className="px-4 py-3">
                    <Link href={`${basePath}/leads/${l.id}`} className="font-semibold text-slate-200 hover:text-brand-300">
                      {l.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {[l.company, l.city && `${l.city}${l.state ? `/${l.state}` : ""}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {l.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.tags.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                            style={{ backgroundColor: `${t.color}26`, color: t.color }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `${l.stage.color}26`, color: l.stage.color }}
                    >
                      {l.stage.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{l.owner?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{l.source ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">
                    {Number(l.estimatedValue) > 0 ? brl(l.estimatedValue) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-8 overflow-hidden rounded-full bg-ink-700">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${l.score}%`, backgroundColor: temp?.color ?? "#64748b" }}
                        />
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{l.score}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{agoLabel(dias)}</td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => excluir(l.id, l.name)}
                        disabled={excluindo === l.id}
                        title="Mover para a lixeira"
                        className="rounded-lg p-1.5 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                      >
                        {excluindo === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dados && dados.pages > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {dados.total} lead(s) · página {dados.page} de {dados.pages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost py-1.5 text-xs disabled:opacity-40">
              Anterior
            </button>
            <button onClick={() => setPage((p) => Math.min(dados.pages, p + 1))} disabled={page >= dados.pages} className="btn-ghost py-1.5 text-xs disabled:opacity-40">
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Selecao({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `fl-${label.toLowerCase().replace(/\W/g, "")}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input py-2">
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
