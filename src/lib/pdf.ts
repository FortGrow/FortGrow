/**
 * Gerador mínimo de PDF para relatórios em tabela.
 *
 * Escrito à mão em vez de trazer uma biblioteca: as opções de PDF em JS
 * pesam de 500 KB a alguns MB e carregam fontes embutidas, o que é caro
 * demais para o que precisamos — uma tabela em Helvetica, paginada. O
 * arquivo gerado é PDF 1.4 sem compressão, aberto por qualquer leitor.
 *
 * Acentos: as fontes base do PDF usam WinAnsiEncoding (Latin-1), então o
 * texto é convertido byte a byte; o que não existe em Latin-1 (emoji, por
 * exemplo) vira "?" em vez de corromper o arquivo.
 */

const A4 = { w: 842, h: 595 }; // paisagem — tabela de CRM tem muitas colunas
const MARGEM = 32;
const LINHA = 16;

type Coluna = { header: string; width: number; align?: "left" | "right" };

/**
 * Pontuação tipográfica que o texto do sistema usa e o Latin-1 não tem.
 * Sem esta tabela, o travessão do título viraria "?" no arquivo gerado.
 */
const EQUIVALENTES: Record<string, string> = {
  "—": "-", "–": "-", "‑": "-",
  "“": '"', "”": '"', "„": '"',
  "‘": "'", "’": "'",
  "…": "...", "•": "-", "→": "->", "×": "x", "≥": ">=", "≤": "<=",
  " ": " ",
};

/** Escapa e converte para Latin-1, o que as fontes base do PDF entendem. */
function pdfText(s: string): Uint8Array {
  const limpo = s
    .replace(/[—–‑“”„‘’…•→×≥≤ ]/g, (c) => EQUIVALENTES[c] ?? c)
    .replace(/[\\()]/g, (c) => `\\${c}`)
    .replace(/[\r\n]+/g, " ");
  const out: number[] = [];
  for (const ch of limpo) {
    const code = ch.codePointAt(0)!;
    out.push(code <= 0xff ? code : 0x3f); // fora do Latin-1 (emoji etc.) → "?"
  }
  return Uint8Array.from(out);
}

/** Corta o texto para caber na largura da coluna (Helvetica ≈ 0.5em/char). */
function ellipsis(s: string, width: number, size: number) {
  const max = Math.max(1, Math.floor(width / (size * 0.5)));
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  // Backed por um ArrayBuffer concreto: é o que `Blob`/`Response` aceitam
  const out = new Uint8Array(new ArrayBuffer(total));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

/**
 * Monta o PDF de uma tabela paginada.
 *
 * @param title  título repetido no topo de cada página
 * @param subtitle linha de contexto (empresa, período, totais)
 * @param columns cabeçalhos e larguras em pontos
 * @param rows   linhas já formatadas como texto
 */
export function tablePdf(
  title: string,
  subtitle: string,
  columns: Coluna[],
  rows: string[][]
) {
  const usable = A4.h - MARGEM * 2 - 64; // desconta cabeçalho da página
  const porPagina = Math.max(1, Math.floor(usable / LINHA) - 1);
  const paginas: string[][][] = [];
  for (let i = 0; i < Math.max(1, rows.length); i += porPagina) {
    paginas.push(rows.slice(i, i + porPagina));
  }

  const streams = paginas.map((linhas, idx) => {
    const ops: Uint8Array[] = [];
    const push = (s: string) => ops.push(ascii(s));
    const texto = (x: number, y: number, s: string, size: number, bold = false) => {
      push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (`);
      ops.push(pdfText(s));
      push(") Tj ET\n");
    };

    let y = A4.h - MARGEM;
    texto(MARGEM, y, title, 15, true);
    y -= 16;
    texto(MARGEM, y, subtitle, 8.5);
    y -= 20;

    // Régua do cabeçalho
    push(`0.85 0.85 0.85 rg ${MARGEM} ${y - 3} ${A4.w - MARGEM * 2} 14 re f\n0 0 0 rg\n`);
    let x = MARGEM + 3;
    for (const col of columns) {
      texto(x, y + 1, ellipsis(col.header, col.width, 8), 8, true);
      x += col.width;
    }
    y -= LINHA;

    for (const linha of linhas) {
      x = MARGEM + 3;
      linha.forEach((cell, i) => {
        const col = columns[i];
        if (!col) return;
        texto(x, y, ellipsis(cell ?? "", col.width, 8), 8);
        x += col.width;
      });
      y -= LINHA;
      // fio separador bem claro
      push(`0.9 0.9 0.9 RG 0.4 w ${MARGEM} ${y + 11} m ${A4.w - MARGEM} ${y + 11} l S\n0 0 0 RG\n`);
    }

    texto(MARGEM, MARGEM - 12, `Página ${idx + 1} de ${paginas.length}`, 7.5);
    return concat(ops);
  });

  // ── Montagem dos objetos ──
  const objs: Uint8Array[] = [];
  const add = (body: Uint8Array | string) =>
    objs.push(typeof body === "string" ? ascii(body) : body);

  const nPages = paginas.length;
  const kids = paginas.map((_, i) => `${4 + i * 2} 0 R`).join(" ");

  add(`<< /Type /Catalog /Pages 2 0 R >>`);
  add(`<< /Type /Pages /Count ${nPages} /Kids [${kids}] >>`);
  add(
    `<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> ` +
      `/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> >> >>`
  );
  streams.forEach((stream, i) => {
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources 3 0 R /Contents ${5 + i * 2} 0 R >>`
    );
    add(concat([ascii(`<< /Length ${stream.length} >>\nstream\n`), stream, ascii(`\nendstream`)]));
  });

  const partes: Uint8Array[] = [ascii("%PDF-1.4\n")];
  const offsets: number[] = [];
  let pos = partes[0].length;
  objs.forEach((body, i) => {
    offsets.push(pos);
    const head = ascii(`${i + 1} 0 obj\n`);
    const tail = ascii(`\nendobj\n`);
    partes.push(head, body, tail);
    pos += head.length + body.length + tail.length;
  });

  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF`;
  partes.push(ascii(xref));

  return concat(partes);
}
