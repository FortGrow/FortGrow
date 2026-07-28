"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { crmPost, type CrmScope } from "./api";
import type { StageDto } from "./types";

/**
 * Importação de leads por CSV.
 *
 * O arquivo é lido no navegador e enviado como texto — o servidor faz o
 * parsing e a validação, porque confiar no que o navegador diz que leu
 * seria confiar no cliente. As colunas são reconhecidas pelo nome do
 * cabeçalho (Nome, Empresa, E-mail, Telefone, WhatsApp, Cidade, UF,
 * Origem, Valor, Etapa, Responsável, Etiquetas, Observações), em pt ou en.
 */

type Resultado = {
  importados: number;
  falhas: number;
  ignorados: number;
  erros: { linha: number; motivo: string }[];
};

export function CrmImport({
  stages,
  scope,
  trigger,
}: {
  stages: StageDto[];
  scope: CrmScope;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [arquivo, setArquivo] = useState<{ nome: string; csv: string } | null>(null);
  const router = useRouter();

  async function escolher(file: File | undefined) {
    setErro(null);
    setResultado(null);
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setErro("Envie um arquivo .csv (exporte a planilha como CSV).");
      return;
    }
    if (file.size > 8_000_000) {
      setErro("Arquivo maior que 8 MB. Divida em partes menores.");
      return;
    }
    setArquivo({ nome: file.name, csv: await file.text() });
  }

  async function importar() {
    if (!arquivo) return;
    setLoading(true);
    setErro(null);
    try {
      const r = await crmPost<Resultado>("/api/crm/import", { csv: arquivo.csv, stageId }, scope);
      setResultado(r);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na importação.");
    } finally {
      setLoading(false);
    }
  }

  function fechar() {
    setOpen(false);
    setArquivo(null);
    setResultado(null);
    setErro(null);
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button className="btn-ghost">
            <Upload size={15} /> Importar CSV
          </button>
        )}
      </span>

      {open && (
        <Overlay>
          <div className="card w-full max-w-lg animate-fade-up p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Importar leads</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Suba um CSV. As colunas são reconhecidas pelo nome do cabeçalho.
                </p>
              </div>
              <button onClick={fechar} className="rounded-lg p-1.5 text-slate-500 hover:bg-ink-800">
                <X size={18} />
              </button>
            </div>

            {!resultado && (
              <>
                <div className="mb-4 rounded-xl bg-ink-850 p-3 text-[11px] leading-relaxed text-slate-500 ring-1 ring-inset ring-line">
                  <span className="font-semibold text-slate-400">Colunas reconhecidas:</span> Nome
                  (obrigatória), Empresa, Cargo, E-mail, Telefone, WhatsApp, Cidade, UF, Origem, Valor,
                  Etapa, Responsável, Etiquetas, Observações, Próximo contato. O que não for reconhecido
                  é ignorado sem quebrar a importação.
                </div>

                <div>
                  <label className="label" htmlFor="imp-stage">Etapa de destino</label>
                  <select id="imp-stage" value={stageId} onChange={(e) => setStageId(e.target.value)} className="input">
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Vale para as linhas sem coluna &quot;Etapa&quot;.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="label" htmlFor="imp-file">Arquivo CSV</label>
                  <input
                    id="imp-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => escolher(e.target.files?.[0])}
                    className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-300"
                  />
                  {arquivo && (
                    <p className="mt-1.5 text-xs text-grow-400">
                      {arquivo.nome} · {(arquivo.csv.length / 1024).toFixed(0)} KB prontos
                    </p>
                  )}
                </div>
              </>
            )}

            {resultado && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-grow-500/10 px-4 py-3 ring-1 ring-inset ring-grow-500/20">
                  <CheckCircle2 size={18} className="shrink-0 text-grow-400" />
                  <p className="text-sm font-semibold text-grow-400">
                    {resultado.importados} lead(s) importado(s)
                  </p>
                </div>
                {(resultado.falhas > 0 || resultado.ignorados > 0) && (
                  <div className="rounded-xl bg-warn/10 px-4 py-3 text-xs text-warn ring-1 ring-inset ring-warn/20">
                    {resultado.falhas > 0 && <p>{resultado.falhas} linha(s) não entraram.</p>}
                    {resultado.ignorados > 0 && (
                      <p>{resultado.ignorados} linha(s) além do limite de 5.000 por importação.</p>
                    )}
                    {resultado.erros.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-[11px]">
                        {resultado.erros.map((e) => (
                          <li key={e.linha}>Linha {e.linha}: {e.motivo}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {erro && <p className="mt-3 text-sm font-medium text-danger">{erro}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={fechar} className="btn-ghost">{resultado ? "Fechar" : "Cancelar"}</button>
              {!resultado && (
                <button onClick={importar} disabled={!arquivo || loading} className="btn-primary">
                  {loading && <Loader2 size={15} className="animate-spin" />} Importar
                </button>
              )}
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
