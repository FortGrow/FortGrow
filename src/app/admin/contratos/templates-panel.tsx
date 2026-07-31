"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileStack, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { TEMPLATE_PLACEHOLDERS } from "@/lib/contract-placeholders";

const cnBody = (soLeitura: boolean) =>
  `input mb-2 font-mono text-xs leading-relaxed${soLeitura ? " opacity-60" : ""}`;

export type TemplateRow = {
  id: string;
  name: string;
  body: string;
  kind: string;
  filePath: string | null;
  updatedAt: string;
};

/**
 * Modelos de contrato da FortGrow: o admin cola a estrutura que já usa,
 * com marcadores ({{EMPRESA}}, {{CNPJ}}...) preenchidos na geração.
 * Adicionar, editar e excluir — o modelo escolhido vira o texto do PDF.
 */
export function TemplatesPanel({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  /* Modo Word: o arquivo .docx original fica guardado e a geração do
     contrato EDITA esse arquivo (marcadores preenchidos em-place) — o texto
     vira só prévia. null = modelo de texto normal. */
  const [docxPath, setDocxPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TemplateRow | null>(null);

  /** Importa a estrutura que já existe em PDF ou Word: extrai o texto para o editor. */
  async function importarPdf(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/contract-templates/extract", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Não foi possível ler o arquivo.");
        return;
      }
      setBody(d.text);
      setDocxPath(d.docxPath ?? null);
      if (!name.trim()) setName(file.name.replace(/\.(pdf|docx)$/i, ""));
    } finally {
      setImporting(false);
    }
  }

  function abrirNovo() {
    setEditing(null);
    setName("");
    setBody("");
    setDocxPath(null);
    setError(null);
    setOpen(true);
  }

  function abrirEdicao(t: TemplateRow) {
    setEditing(t);
    setName(t.name);
    setBody(t.body);
    setDocxPath(t.kind === "DOCX" ? t.filePath : null);
    setError(null);
    setOpen(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { name, body, filePath: docxPath };
      const res = await fetch("/api/contract-templates", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Não foi possível salvar o modelo.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function excluir(t: TemplateRow) {
    setLoading(true);
    try {
      const res = await fetch(`/api/contract-templates?id=${t.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb-6 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FileStack size={16} className="text-brand-400" />
        <h2 className="text-sm font-bold text-slate-200">Modelos de contrato</h2>
        <span className="text-xs text-slate-500">
          sua estrutura própria — o texto do PDF sai daqui, com os dados do cliente preenchidos
        </span>
        <button onClick={abrirNovo} className="btn-primary ml-auto !px-3.5 !py-2 text-xs">
          <Plus size={14} /> Adicionar modelo
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-line/60 bg-ink-900/40 px-4 py-3 text-xs text-slate-500">
          Nenhum modelo ainda — sem modelo, o contrato sai com o texto padrão gerado pelo sistema. Clique em
          “Adicionar modelo” e cole a estrutura de contrato que você já usa.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-line/60 bg-ink-900/40 p-4">
              <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-200">
                {t.name}
                {t.kind === "DOCX" && (
                  <span className="rounded-full bg-grow-500/15 px-2 py-0.5 text-[10px] font-bold text-grow-400">
                    Word — edita seu arquivo
                  </span>
                )}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.body.slice(0, 160)}</p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => abrirEdicao(t)} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(t)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 size={13} className="mr-1 inline" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Overlay>
          <form onSubmit={salvar} className="card w-full max-w-3xl p-6">
            <h2 className="mb-1 text-base font-bold text-slate-100">
              {editing ? "Editar modelo" : "Adicionar modelo de contrato"}
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Cole o texto do seu contrato ou use “Importar de PDF ou Word” para trazer a estrutura que você
              já tem pronta (.pdf ou .docx) — títulos e negritos do Word são preservados como títulos de seção.
              Depois, troque os dados do cliente pelos marcadores (legenda abaixo). Vira título de seção: linha
              começando com “## ”, em CAIXA-ALTA ou começando com “CLÁUSULA”; “ASSINATURA: Nome — Parte” vira
              linha de assinatura com régua. O PDF final sai no layout oficial FortGrow (logo, cores e rodapé).
            </p>

            <label className="label" htmlFor="tpl-nome">Nome do modelo *</label>
            <input
              id="tpl-nome"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Contrato padrão FortGrow"
              className="input mb-3"
            />

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label className="label !mb-0" htmlFor="tpl-body">Texto do contrato *</label>
              <label className="btn-ghost ml-auto cursor-pointer !px-3 !py-1.5 text-xs">
                {importing ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
                {importing ? "Lendo arquivo…" : "Importar de PDF ou Word"}
                <input
                  type="file"
                  accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={importarPdf}
                  className="hidden"
                />
              </label>
            </div>
            {docxPath && (
              <div className="mb-2 rounded-xl border border-grow-500/40 bg-grow-500/10 px-4 py-3 text-xs leading-relaxed text-grow-400">
                <b>Modo Word ativo:</b> o arquivo .docx original fica guardado e cada contrato é gerado{" "}
                <b>editando esse arquivo</b> — os marcadores {"{{...}}"} são preenchidos dentro dele e o layout
                (fontes, logo, formatação) permanece exatamente como você fez no Word. O texto abaixo é só uma
                prévia; para alterar o contrato, edite o Word e importe de novo.{" "}
                <button type="button" onClick={() => setDocxPath(null)} className="font-semibold underline">
                  Desativar e usar como texto
                </button>
              </div>
            )}
            <textarea
              id="tpl-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              readOnly={Boolean(docxPath)}
              rows={14}
              placeholder={"CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nCONTRATANTE: {{EMPRESA}}, CNPJ {{CNPJ}}...\n\nCLÁUSULA 1ª — DO OBJETO\n..."}
              className={cnBody(Boolean(docxPath))}
            />

            <details className="mb-4 rounded-xl border border-line/60 bg-ink-900/40 px-4 py-3">
              <summary className="cursor-pointer text-xs font-semibold text-brand-400">
                Marcadores disponíveis (preenchidos automaticamente com os dados do cliente)
              </summary>
              <div className="mt-2 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <p key={p.chave}>
                    <code className="rounded bg-ink-800 px-1.5 py-0.5 text-brand-300">{`{{${p.chave}}}`}</code>{" "}
                    {p.descricao}
                  </p>
                ))}
              </div>
            </details>

            {error && <p className="mb-3 text-sm font-medium text-danger">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {editing ? "Salvar alterações" : "Salvar modelo"}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {confirmDelete && (
        <Overlay>
          <div className="card w-full max-w-md p-6">
            <h2 className="mb-2 text-base font-bold text-slate-100">Excluir modelo?</h2>
            <p className="mb-4 text-sm text-slate-400">
              “{confirmDelete.name}” será removido. Contratos já gerados com ele não são afetados.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">Cancelar</button>
              <button
                onClick={() => excluir(confirmDelete)}
                disabled={loading}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/80"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} className="mr-1 inline" />}
                Excluir
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
