"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, CheckCircle2, ChevronDown, Eye, FileText, Loader2, RefreshCw, Send, Sparkles,
  Target, Trash2, Upload, X,
} from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/badge";
import { cn, fullDate } from "@/lib/utils";

/**
 * Planejamentos em PDF: anexo, leitura automática e publicação.
 *
 * O fluxo é de propósito em dois passos — sobe e lê, depois publica. A
 * leitura automática acerta a maior parte, mas planejamento é entregável de
 * cliente: alguém precisa bater o olho antes de virar o calendário que ele
 * vai cobrar. Enquanto está em rascunho, nada aparece no portal.
 */

export type PlanoDto = {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  method: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  uploadedByName: string | null;
  parsed: {
    objetivos?: string[];
    conteudos?: { titulo: string; descricao?: string }[];
    roteiros?: { titulo: string; texto: string }[];
    calendario?: { data: string; titulo: string; formato?: string; roteiro?: string }[];
    resumo?: string;
  };
};

export function PlanningPanel({
  plans,
  clients,
  projects,
  podeEditar,
}: {
  plans: PlanoDto[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  podeEditar: boolean;
}) {
  const [enviando, setEnviando] = useState(false);
  const [detalhe, setDetalhe] = useState<PlanoDto | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const router = useRouter();

  const projetosDoCliente = projects.filter((p) => p.clientId === clientId);

  async function enviar(file: File | undefined) {
    if (!file || !clientId) return;
    setEnviando(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("clientId", clientId);
      if (projectId) fd.append("projectId", projectId);
      const res = await fetch("/api/plannings", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível ler o PDF.");
        return;
      }
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function acao(id: string, corpo: Record<string, unknown>) {
    setOcupado(id);
    setErro(null);
    try {
      const res = await fetch("/api/plannings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...corpo }),
      });
      if (!res.ok) {
        setErro((await res.json().catch(() => ({}))).error ?? "Falha na operação.");
        return;
      }
      setDetalhe(null);
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(p: PlanoDto) {
    if (!confirm(`Excluir "${p.fileName}"? As postagens geradas por ele saem do calendário do cliente.`)) return;
    setOcupado(p.id);
    try {
      await fetch(`/api/plannings?id=${p.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <FileText size={15} className="text-brand-400" /> Planejamento em PDF
          </h2>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500">
            Anexe o PDF do planejamento. O sistema lê objetivos, conteúdos, roteiros e o calendário de
            postagem, e — depois da sua revisão — publica tudo no portal do cliente.
          </p>
        </div>
      </div>

      {podeEditar && (
        <div className="mb-4 grid gap-3 rounded-xl border border-line bg-ink-850 p-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pl-client">Cliente</label>
            <select
              id="pl-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId("");
              }}
              className="input py-2 text-sm"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pl-project">Projeto (opcional)</label>
            <select id="pl-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input py-2 text-sm">
              <option value="">Sem projeto vinculado</option>
              {projetosDoCliente.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pl-file">Arquivo</label>
            <input
              id="pl-file"
              type="file"
              accept="application/pdf,.pdf"
              disabled={enviando || !clientId}
              onChange={(e) => {
                enviar(e.target.files?.[0]);
                e.target.value = "";
              }}
              className="input py-1.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-300"
            />
          </div>
        </div>
      )}

      {enviando && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-brand-500/10 px-4 py-2.5 text-sm font-medium text-brand-300">
          <Loader2 size={15} className="animate-spin" /> Lendo o PDF… isso leva alguns segundos.
        </p>
      )}
      {erro && (
        <p className="mb-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
          {erro}
        </p>
      )}

      {plans.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-600">
          Nenhum planejamento anexado ainda.
        </p>
      ) : (
        <div className="divide-y divide-line/60">
          {plans.map((p) => {
            const c = p.parsed ?? {};
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                    {p.fileName}
                    <Badge tone={p.status === "PUBLICADO" ? "grow" : "slate"}>
                      {p.status === "PUBLICADO" ? "NO PORTAL" : "RASCUNHO"}
                    </Badge>
                    {p.method === "IA" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
                        <Sparkles size={9} /> lido com IA
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.clientName}
                    {p.projectName && ` · ${p.projectName}`} · {fullDate(p.createdAt)}
                    {p.uploadedByName && ` · ${p.uploadedByName}`}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span><strong className="text-slate-300">{c.objetivos?.length ?? 0}</strong> objetivos</span>
                    <span><strong className="text-slate-300">{c.conteudos?.length ?? 0}</strong> conteúdos</span>
                    <span><strong className="text-slate-300">{c.roteiros?.length ?? 0}</strong> roteiros</span>
                    <span><strong className="text-slate-300">{c.calendario?.length ?? 0}</strong> postagens</span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button onClick={() => setDetalhe(p)} className="btn-ghost py-1.5 text-xs">
                    <Eye size={13} /> Revisar
                  </button>
                  {podeEditar && (
                    <>
                      <button
                        onClick={() => acao(p.id, { status: p.status === "PUBLICADO" ? "RASCUNHO" : "PUBLICADO" })}
                        disabled={ocupado === p.id}
                        className={cn("py-1.5 text-xs", p.status === "PUBLICADO" ? "btn-ghost" : "btn-primary")}
                      >
                        {ocupado === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        {p.status === "PUBLICADO" ? "Despublicar" : "Publicar"}
                      </button>
                      <button
                        onClick={() => excluir(p)}
                        disabled={ocupado === p.id}
                        title="Excluir"
                        className="rounded-lg p-2 text-slate-600 transition hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detalhe && (
        <DetalhePlano
          plano={detalhe}
          podeEditar={podeEditar}
          ocupado={ocupado === detalhe.id}
          onFechar={() => setDetalhe(null)}
          onReprocessar={() => acao(detalhe.id, { reprocessar: true })}
          onPublicar={() => acao(detalhe.id, { status: "PUBLICADO" })}
        />
      )}
    </div>
  );
}

function DetalhePlano({
  plano,
  podeEditar,
  ocupado,
  onFechar,
  onReprocessar,
  onPublicar,
}: {
  plano: PlanoDto;
  podeEditar: boolean;
  ocupado: boolean;
  onFechar: () => void;
  onReprocessar: () => void;
  onPublicar: () => void;
}) {
  const c = plano.parsed ?? {};
  const [aberto, setAberto] = useState<string | null>(null);

  const vazio =
    !c.objetivos?.length && !c.conteudos?.length && !c.roteiros?.length && !c.calendario?.length;

  return (
    <Overlay>
      <div className="card max-h-[92vh] w-full max-w-3xl animate-fade-up overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-100">{plano.fileName}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {plano.clientName} · lido {plano.method === "IA" ? "com IA" : "por regras de texto"} ·{" "}
              <a href={plano.fileUrl} target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
                abrir PDF original
              </a>
            </p>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink-800">
            <X size={18} />
          </button>
        </div>

        {c.resumo && (
          <p className="mb-4 rounded-xl bg-ink-850 p-3 text-sm text-slate-300 ring-1 ring-inset ring-line">
            {c.resumo}
          </p>
        )}

        {vazio ? (
          <div className="rounded-xl border border-warn/25 bg-warn/10 p-4 text-sm text-warn">
            Não consegui identificar as seções neste PDF. Isso costuma acontecer quando o planejamento
            é uma apresentação com o texto dentro de imagens, ou quando os títulos não usam palavras
            como &quot;Objetivos&quot;, &quot;Conteúdo&quot;, &quot;Roteiro&quot; e &quot;Calendário&quot;.
            Com a chave da IA configurada no servidor, a leitura entende também planejamentos escritos
            em prosa — depois de configurar, use &quot;Ler de novo&quot;.
          </div>
        ) : (
          <div className="space-y-4">
            <Secao icone={<Target size={13} />} titulo="Objetivos" contador={c.objetivos?.length ?? 0}>
              <ul className="space-y-1.5">
                {c.objetivos?.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-grow-400" />
                    {o}
                  </li>
                ))}
              </ul>
            </Secao>

            <Secao icone={<FileText size={13} />} titulo="Conteúdos" contador={c.conteudos?.length ?? 0}>
              <ul className="space-y-2">
                {c.conteudos?.map((x, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium text-slate-200">{x.titulo}</p>
                    {x.descricao && <p className="text-xs text-slate-500">{x.descricao}</p>}
                  </li>
                ))}
              </ul>
            </Secao>

            <Secao icone={<Sparkles size={13} />} titulo="Roteiros" contador={c.roteiros?.length ?? 0}>
              <div className="space-y-2">
                {c.roteiros?.map((r, i) => (
                  <div key={i} className="rounded-lg border border-line bg-ink-850 p-2.5">
                    <button
                      onClick={() => setAberto(aberto === `r${i}` ? null : `r${i}`)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className="text-sm font-medium text-slate-200">{r.titulo}</span>
                      <ChevronDown size={13} className={cn("shrink-0 text-slate-500 transition-transform", aberto === `r${i}` && "rotate-180")} />
                    </button>
                    {aberto === `r${i}` && (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{r.texto}</p>
                    )}
                  </div>
                ))}
              </div>
            </Secao>

            <Secao icone={<CalendarDays size={13} />} titulo="Calendário de postagem" contador={c.calendario?.length ?? 0}>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-ink-850">
                    <tr className="border-b border-line text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 font-semibold">Data</th>
                      <th className="px-3 py-2 font-semibold">Publicação</th>
                      <th className="px-3 py-2 font-semibold">Formato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {c.calendario?.map((p, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-400">
                          {new Date(`${p.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </td>
                        <td className="px-3 py-1.5 text-slate-300">{p.titulo}</td>
                        <td className="px-3 py-1.5 text-slate-500">{p.formato ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Secao>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {podeEditar && (
            <button onClick={onReprocessar} disabled={ocupado} className="btn-ghost">
              {ocupado ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Ler de novo
            </button>
          )}
          <button onClick={onFechar} className="btn-ghost">Fechar</button>
          {podeEditar && plano.status !== "PUBLICADO" && !vazio && (
            <button onClick={onPublicar} disabled={ocupado} className="btn-primary">
              <Send size={15} /> Publicar para o cliente
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function Secao({
  icone,
  titulo,
  contador,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  contador: number;
  children: React.ReactNode;
}) {
  if (contador === 0) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        {icone} {titulo}
        <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-400">{contador}</span>
      </h3>
      {children}
    </div>
  );
}
