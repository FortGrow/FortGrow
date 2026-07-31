import { deflateRawSync, inflateRawSync } from "zlib";

/**
 * Preenchimento de .docx EM-PLACE: em vez de gerar um documento novo, o
 * arquivo Word original do admin é reescrito com os {{marcadores}}
 * substituídos pelos dados do cliente — layout, fontes, logo e tudo o
 * mais ficam exatamente como ele fez no Word.
 *
 * Sem dependência nova: o .docx é um ZIP; lemos todas as entradas,
 * trocamos os marcadores nos XMLs de texto (documento, cabeçalhos e
 * rodapés) e remontamos o ZIP com o zlib do Node.
 */

type Entrada = { nome: string; dados: Buffer };

/** Todas as entradas do ZIP (nome + conteúdo descomprimido). */
function listarEntradas(buf: Buffer): Entrada[] | null {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const total = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  const entradas: Entrada[] = [];

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) return null;
    const metodo = buf.readUInt16LE(pos + 10);
    const tamComprimido = buf.readUInt32LE(pos + 20);
    const nomeLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const comentLen = buf.readUInt16LE(pos + 32);
    const offsetLocal = buf.readUInt32LE(pos + 42);
    const nome = buf.toString("utf8", pos + 46, pos + 46 + nomeLen);

    const localNomeLen = buf.readUInt16LE(offsetLocal + 26);
    const localExtraLen = buf.readUInt16LE(offsetLocal + 28);
    const inicio = offsetLocal + 30 + localNomeLen + localExtraLen;
    const brutos = buf.subarray(inicio, inicio + tamComprimido);
    const dados =
      metodo === 0 ? Buffer.from(brutos) : metodo === 8 ? inflateRawSync(brutos) : null;
    if (dados === null) return null;
    entradas.push({ nome, dados });
    pos += 46 + nomeLen + extraLen + comentLen;
  }
  return entradas;
}

/* CRC-32 (polinômio do ZIP) — tabela gerada uma vez */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Remonta o ZIP com as entradas dadas (DEFLATE). */
function montarZip(entradas: Entrada[]): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;

  for (const { nome, dados } of entradas) {
    const nomeBuf = Buffer.from(nome, "utf8");
    const comprimido = deflateRawSync(dados);
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versão
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // DEFLATE
    local.writeUInt16LE(0, 10); // hora
    local.writeUInt16LE(0x21, 12); // data (válida qualquer; 1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locais.push(local, nomeBuf, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBuf.length, 28);
    // extra/coment/disco/attrs internos e externos ficam zerados
    central.writeUInt32LE(offset, 42);
    centrais.push(central, nomeBuf);

    offset += 30 + nomeBuf.length + comprimido.length;
  }

  const dirOffset = offset;
  const dir = Buffer.concat(centrais);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entradas.length, 8);
  eocd.writeUInt16LE(entradas.length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(dirOffset, 16);

  return Buffer.concat([...locais, dir, eocd]);
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const decodeEnt = (s: string) =>
  s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (m, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[code] ?? m;
  });

/**
 * Troca {{MARCADOR}} nos parágrafos de um XML do Word. O Word costuma
 * partir o texto em vários "runs" (até no meio de um marcador), então em
 * parágrafos que contêm marcador o texto inteiro é consolidado no primeiro
 * run — a formatação do começo da linha passa a valer para ela toda, que é
 * o comportamento esperado numa linha de qualificação de contrato.
 */
function preencherXml(xml: string, valores: Record<string, string>): string {
  const troca = (texto: string) =>
    texto.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (m, k: string) => valores[k.toUpperCase()] ?? m);

  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (par) => {
    const trechos = [...par.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => decodeEnt(m[1]));
    const juntado = trechos.join("");
    if (!/\{\{\s*[A-Za-z_]+\s*\}\}/.test(juntado)) return par;

    const preenchido = escapeXml(troca(juntado));
    let primeiro = true;
    return par.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => {
      if (primeiro) {
        primeiro = false;
        return `<w:t xml:space="preserve">${preenchido}</w:t>`;
      }
      return `<w:t xml:space="preserve"></w:t>`;
    });
  });
}

/**
 * Edita o .docx original preenchendo os marcadores com os dados do
 * cliente — corpo, cabeçalhos e rodapés. Retorna o novo .docx, ou null se
 * o arquivo não puder ser lido.
 */
export function preencherDocx(bytes: Buffer, valores: Record<string, string>): Buffer | null {
  const entradas = listarEntradas(bytes);
  if (!entradas || !entradas.some((e) => e.nome === "word/document.xml")) return null;

  const novas = entradas.map((e) => {
    if (/^word\/(document|header\d*|footer\d*)\.xml$/.test(e.nome)) {
      return { nome: e.nome, dados: Buffer.from(preencherXml(e.dados.toString("utf8"), valores), "utf8") };
    }
    return e;
  });
  return montarZip(novas);
}
