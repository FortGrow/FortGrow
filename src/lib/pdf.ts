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
const RETRATO = { w: 595, h: 842 }; // documentos de texto (contratos)
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

  return montarPdf(streams, A4);
}

/** Imagem JPEG embutível (o PDF aceita JPEG cru via DCTDecode). */
export type PdfImagem = { data: Uint8Array; width: number; height: number };

/** Junta os streams de página no arquivo final (catálogo, fontes, xref).
    Sem anotação de retorno de propósito: herda o Uint8Array<ArrayBuffer>
    do concat(), que é o que Blob/NextResponse aceitam. */
function montarPdf(streams: Uint8Array[], box: { w: number; h: number }, imagem?: PdfImagem) {
  const objs: Uint8Array[] = [];
  const add = (body: Uint8Array | string) =>
    objs.push(typeof body === "string" ? ascii(body) : body);

  const kids = streams.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
  // A imagem (logo) é o último objeto — numeração fixa e fácil de referenciar
  const imgNum = 4 + streams.length * 2;

  add(`<< /Type /Catalog /Pages 2 0 R >>`);
  add(`<< /Type /Pages /Count ${streams.length} /Kids [${kids}] >>`);
  add(
    `<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> ` +
      `/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> >>` +
      (imagem ? ` /XObject << /Im1 ${imgNum} 0 R >>` : "") +
      ` >>`
  );
  streams.forEach((stream, i) => {
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${box.w} ${box.h}] /Resources 3 0 R /Contents ${5 + i * 2} 0 R >>`
    );
    add(concat([ascii(`<< /Length ${stream.length} >>\nstream\n`), stream, ascii(`\nendstream`)]));
  });
  if (imagem) {
    add(
      concat([
        ascii(
          `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imagem.data.length} >>\nstream\n`
        ),
        imagem.data,
        ascii(`\nendstream`),
      ])
    );
  }

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

/* ————— Documento de texto (contratos) ————— */

export type DocBloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  /** Linha de assinatura: régua com o nome/qualificação embaixo */
  | { tipo: "assinatura"; texto: string };

/** Quebra o texto em linhas de até maxChars, sem partir palavras. */
function wrapTexto(texto: string, maxChars: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const cand = atual ? `${atual} ${p}` : p;
    if (cand.length > maxChars && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = cand;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

/** Identidade visual aplicada ao documento (logo, cor e rodapé). */
export type DocMarca = {
  logo?: PdfImagem;
  /** Cor de destaque das réguas, em RGB 0–1 */
  cor?: [number, number, number];
  /** Linha institucional impressa no rodapé de todas as páginas */
  rodape?: string;
};

/**
 * PDF de documento em retrato (A4) com título, seções e parágrafos com
 * quebra de linha — usado para gerar o contrato que o cliente assina no
 * gov.br. Mesma base minimalista do gerador de tabelas; com `marca`, o
 * cabeçalho ganha a logo e as réguas saem na cor da marca.
 */
export function docPdf(titulo: string, subtitulo: string, blocos: DocBloco[], marca?: DocMarca) {
  const M = 56;
  const corpo = 10.5;
  const charsPorLinha = Math.floor((RETRATO.w - M * 2) / (corpo * 0.5));
  const alturaLinha = (size: number) => size * 1.45;
  const [cr, cg, cb] = marca?.cor ?? [0.25, 0.25, 0.25];
  // Logo no cabeçalho da 1ª página: 52pt de altura, largura proporcional
  const logoH = 52;
  const logoW = marca?.logo ? Math.round((logoH * marca.logo.width) / marca.logo.height) : 0;

  type L = { texto: string; size: number; bold: boolean; gap: number; regua?: boolean; destaque?: boolean };
  const linhas: L[] = [];
  for (const b of blocos) {
    if (b.tipo === "titulo") {
      linhas.push({ texto: b.texto, size: 11.5, bold: true, gap: 18, destaque: true });
    } else if (b.tipo === "assinatura") {
      linhas.push({ texto: b.texto, size: corpo, bold: false, gap: 48, regua: true });
    } else {
      wrapTexto(b.texto, charsPorLinha).forEach((w, i) =>
        linhas.push({ texto: w, size: corpo, bold: false, gap: i === 0 ? 12 : 0 })
      );
    }
  }

  // Pagina calculando a posição de cada linha
  const topo = RETRATO.h - M;
  // 1ª página desconta o cabeçalho (maior quando há logo)
  const alturaCabecalho = marca?.logo ? logoH + 26 : 64;
  type Pos = { l: L; y: number };
  const paginas: Pos[][] = [];
  let pagina: Pos[] = [];
  let y = topo - alturaCabecalho;
  for (const l of linhas) {
    y -= l.gap;
    const lh = alturaLinha(l.size);
    if (y - lh < M + 26) {
      paginas.push(pagina);
      pagina = [];
      y = topo - 24;
    }
    y -= lh;
    pagina.push({ l, y });
  }
  paginas.push(pagina);

  const streams = paginas.map((ps, idx) => {
    const ops: Uint8Array[] = [];
    const push = (s: string) => ops.push(ascii(s));
    const texto = (x: number, yy: number, s: string, size: number, bold = false) => {
      push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${yy} Td (`);
      ops.push(pdfText(s));
      push(") Tj ET\n");
    };

    if (idx === 0) {
      if (marca?.logo) {
        // Logo no topo esquerdo; título e subtítulo ao lado, régua na cor da marca
        push(`q ${logoW} 0 0 ${logoH} ${M} ${topo - logoH + 6} cm /Im1 Do Q\n`);
        const tx = M + logoW + 16;
        texto(tx, topo - 16, titulo, 13.5, true);
        texto(tx, topo - 32, subtitulo, 9);
        push(`${cr} ${cg} ${cb} RG 1.4 w ${M} ${topo - logoH - 6} m ${RETRATO.w - M} ${topo - logoH - 6} l S\n0 0 0 RG\n`);
      } else {
        texto(M, topo - 6, titulo, 14, true);
        texto(M, topo - 24, subtitulo, 9);
        push(`${cr} ${cg} ${cb} RG 1 w ${M} ${topo - 34} m ${RETRATO.w - M} ${topo - 34} l S\n0 0 0 RG\n`);
      }
    }
    for (const { l, y: yy } of ps) {
      if (l.regua) {
        push(`0.25 0.25 0.25 RG 0.7 w ${M} ${yy + l.size + 5} m ${M + 250} ${yy + l.size + 5} l S\n0 0 0 RG\n`);
      }
      // Títulos de seção saem na cor da marca
      if (l.destaque && marca?.cor) push(`${cr} ${cg} ${cb} rg\n`);
      texto(M, yy, l.texto, l.size, l.bold);
      if (l.destaque && marca?.cor) push(`0 0 0 rg\n`);
    }
    // Rodapé institucional em todas as páginas, na cor da marca
    push(`${cr} ${cg} ${cb} RG 0.8 w ${M} ${M - 8} m ${RETRATO.w - M} ${M - 8} l S\n0 0 0 RG\n`);
    if (marca?.rodape) texto(M, M - 20, marca.rodape, 7.5);
    texto(RETRATO.w - M - 66, M - 20, `Página ${idx + 1} de ${paginas.length}`, 7.5);
    return concat(ops);
  });

  return montarPdf(streams, RETRATO, marca?.logo);
}
