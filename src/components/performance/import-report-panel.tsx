"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildImportRows,
  IMPORT_FIELDS,
  type BuildResult,
  type ImportFieldKey,
} from "@/lib/performance-import";

type Step = "idle" | "preview" | "importing" | "done";
type RowError = { rowNumber: number; message: string };

/**
 * Importação Automática de Relatório (.xlsx) para as Métricas do Cliente.
 * Lê o Excel no navegador (SheetJS), faz o "de-para" das colunas, valida e
 * mostra uma prévia. Ao confirmar, grava cada linha reutilizando a API atual
 * (POST /api/performance) — sem alterar o fluxo manual existente.
 */
export function ImportReportPanel({
  clientId,
  onImported,
}: {
  clientId: string;
  onImported: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheet, setSheet] = useState("");
  const [build, setBuild] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ imported: number; errors: RowError[] } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // guarda o workbook lido para trocar de planilha sem reler o arquivo
  const wbRef = useRef<unknown>(null);

  function reset() {
    setStep("idle");
    setFileName("");
    setSheetNames([]);
    setSheet("");
    setBuild(null);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    wbRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  }

  async function parseSheet(name: string) {
    const XLSX = await import("xlsx");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wb = wbRef.current as any;
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false, defval: null }) as unknown[][];
    setBuild(buildImportRows(aoa));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Formato inválido. Envie um arquivo .xlsx.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      wbRef.current = wb;
      setFileName(file.name);
      setSheetNames(wb.SheetNames);
      const first = wb.SheetNames[0];
      setSheet(first);
      await parseSheet(first);
      setStep("preview");
    } catch {
      setError("Não foi possível ler o arquivo. Confira se é um .xlsx válido.");
    }
  }

  async function onSheetChange(name: string) {
    setSheet(name);
    await parseSheet(name);
  }

  async function doImport() {
    if (!build) return;
    const valid = build.rows.filter((r) => r.payload);
    if (!valid.length) return;
    setStep("importing");
    setProgress({ done: 0, total: valid.length });
    const errors: RowError[] = [];
    let imported = 0;
    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        const res = await fetch("/api/performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, ...row.payload }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          errors.push({ rowNumber: row.rowNumber, message: d.error ?? "Falha ao gravar." });
        } else {
          imported++;
        }
      } catch {
        errors.push({ rowNumber: row.rowNumber, message: "Erro de conexão." });
      }
      setProgress({ done: i + 1, total: valid.length });
    }
    setResult({ imported, errors });
    setStep("done");
    if (imported > 0) await onImported();
  }

  // campos que apareceram na planilha (na ordem oficial) para montar a prévia
  const shownFields: ImportFieldKey[] = useMemo(() => {
    if (!build) return [];
    return IMPORT_FIELDS.map((f) => f.key).filter((k) => build.match.byField[k]);
  }, [build]);

  const previewRows = build?.rows.slice(0, 8) ?? [];
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="card p-5">
      {/* Cabeçalho da seção — recolhido por padrão para não poluir o layout */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
          <FileSpreadsheet size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-200">Importação Automática de Relatório</span>
          <span className="block text-xs text-slate-500">
            Suba o relatório da campanha (.xlsx) e preencha as métricas sem digitar.
          </span>
        </span>
        <ChevronDown size={18} className={cn("shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={onFile}
            className="hidden"
          />

          {/* Botão principal / arquivo selecionado */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => inputRef.current?.click()} className="btn-primary !py-2.5">
              📊 Importar Relatório (.xlsx)
            </button>
            {fileName && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-ink-900/60 px-3 py-2 text-xs text-slate-300">
                <FileSpreadsheet size={13} className="text-brand-300" />
                <span className="max-w-[220px] truncate">{fileName}</span>
                <button onClick={reset} title="Remover" className="text-slate-500 hover:text-danger">
                  <X size={13} />
                </button>
              </span>
            )}
            {sheetNames.length > 1 && step !== "importing" && (
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Planilha:
                <select
                  value={sheet}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="input !w-auto !py-1.5 text-xs"
                >
                  {sheetNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {error && (
            <p className="inline-flex items-center gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
              <AlertTriangle size={15} /> {error}
            </p>
          )}

          {/* Prévia + validação */}
          {build && (step === "preview" || step === "done") && (
            <>
              {/* Colunas reconhecidas */}
              <div className="rounded-2xl border border-line/60 bg-ink-900/40 p-3.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Colunas reconhecidas
                </p>
                {build.match.matched.length === 0 ? (
                  <p className="text-sm text-danger">
                    Nenhuma coluna reconhecida. Confira se a primeira linha tem os títulos (Data, Investimento, Leads…).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {build.match.matched.map((m) => (
                      <span
                        key={m.field}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-200"
                        title={`"${m.header}" → ${m.label}`}
                      >
                        {m.header} <span className="text-brand-400">→</span> {m.label}
                      </span>
                    ))}
                  </div>
                )}
                {(build.match.derived.length > 0 || build.match.unmatched.length > 0) && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {build.match.derived.length > 0 && (
                      <>Calculadas automaticamente (ignoradas): {build.match.derived.join(", ")}. </>
                    )}
                    {build.match.unmatched.length > 0 && (
                      <>Não reconhecidas: {build.match.unmatched.join(", ")}.</>
                    )}
                  </p>
                )}
              </div>

              {/* Contadores */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-grow-500/10 px-3 py-1.5 font-semibold text-grow-400">
                  {build.validCount} {build.validCount === 1 ? "linha válida" : "linhas válidas"}
                </span>
                {build.errorCount > 0 && (
                  <span className="rounded-lg bg-danger/10 px-3 py-1.5 font-semibold text-danger">
                    {build.errorCount} com erro
                  </span>
                )}
                {build.skipped > 0 && (
                  <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-medium text-slate-500">
                    {build.skipped} vazias ignoradas
                  </span>
                )}
              </div>

              {/* Prévia dos dados */}
              {shownFields.length > 0 && build.rows.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-line/60">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-ink-800 text-left text-slate-400">
                        <th className="px-3 py-2 font-semibold">#</th>
                        {shownFields.map((k) => (
                          <th key={k} className="whitespace-nowrap px-3 py-2 font-semibold">
                            {IMPORT_FIELDS.find((f) => f.key === k)!.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-semibold">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row.rowNumber} className="border-t border-line/40">
                          <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                          {shownFields.map((k) => (
                            <td key={k} className="whitespace-nowrap px-3 py-2 text-slate-300">
                              {row.display[k] ?? "—"}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            {row.errors.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-grow-400">
                                <CheckCircle2 size={13} /> ok
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-danger" title={row.errors.join(" ")}>
                                <AlertTriangle size={13} /> erro
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {build.rows.length > previewRows.length && (
                    <p className="border-t border-line/40 px-3 py-2 text-[11px] text-slate-500">
                      + {build.rows.length - previewRows.length} linha(s) — prévia mostra as primeiras {previewRows.length}.
                    </p>
                  )}
                </div>
              )}

              {/* Erros detalhados por linha */}
              {build.errorCount > 0 && (
                <div className="rounded-2xl border border-danger/25 bg-danger/5 p-3.5">
                  <p className="mb-1.5 text-xs font-semibold text-danger">Linhas com problema:</p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {build.rows
                      .filter((r) => r.errors.length)
                      .slice(0, 12)
                      .map((r) => (
                        <li key={r.rowNumber}>
                          <b className="text-danger">Linha {r.rowNumber}:</b> {r.errors.join(" ")}
                        </li>
                      ))}
                    {build.rows.filter((r) => r.errors.length).length > 12 && (
                      <li className="text-slate-500">…e mais linhas com erro.</li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Barra de progresso */}
          {step === "importing" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Importando…
                </span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Resultado final */}
          {step === "done" && result && (
            <div
              className={cn(
                "rounded-2xl border p-3.5",
                result.errors.length === 0 ? "border-grow-500/25 bg-grow-500/5" : "border-warn/25 bg-warn/5",
              )}
            >
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-grow-400">
                <CheckCircle2 size={16} /> {result.imported} lançamento(s) importado(s) com sucesso.
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                  {result.errors.slice(0, 12).map((e) => (
                    <li key={e.rowNumber}>
                      <b className="text-danger">Linha {e.rowNumber}:</b> {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Ações */}
          {(step === "preview" || step === "done") && build && (
            <div className="flex items-center justify-end gap-3">
              <button onClick={reset} className="btn-ghost !py-2 text-xs">
                {step === "done" ? "Fechar" : "Cancelar"}
              </button>
              {step === "preview" && (
                <button
                  onClick={doImport}
                  disabled={build.validCount === 0}
                  className="btn-primary !py-2 text-xs"
                >
                  <Upload size={14} /> Importar {build.validCount} {build.validCount === 1 ? "linha" : "linhas"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
