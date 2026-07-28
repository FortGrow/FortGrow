/**
 * Leitor de CSV tolerante ao que as pessoas realmente exportam.
 *
 * Lida com aspas, aspas escapadas (""), quebras de linha dentro do campo,
 * CRLF, BOM do Excel e separador `;` ou `,` — detectado pela primeira
 * linha, porque planilha em pt-BR sai com ponto e vírgula e a de fora com
 * vírgula, e pedir para o usuário escolher é fricção desnecessária.
 */

export function detectDelimiter(sample: string): string {
  const linha = sample.split(/\r?\n/, 1)[0] ?? "";
  let dentro = false;
  let ponto = 0;
  let virgula = 0;
  let tab = 0;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') dentro = !dentro;
    else if (!dentro) {
      if (c === ";") ponto++;
      else if (c === ",") virgula++;
      else if (c === "\t") tab++;
    }
  }
  if (tab > ponto && tab > virgula) return "\t";
  return ponto >= virgula ? ";" : ",";
}

export function parseCsv(text: string, delimiter?: string): string[][] {
  const raw = text.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(raw);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let dentro = false;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];

    if (dentro) {
      if (c === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else dentro = false;
      } else field += c;
      continue;
    }

    if (c === '"') dentro = true;
    else if (c === d) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  // descarta linhas totalmente vazias (rodapés de planilha)
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Normaliza cabeçalho para comparação: sem acento, minúsculo, sem pontuação. */
export function slugHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
