import { inflateRawSync } from "zlib";

/**
 * Extrator de texto de .docx sem dependência nova: um .docx é um ZIP e o
 * texto vive em word/document.xml. Lemos o diretório central do ZIP,
 * inflamos essa entrada com o zlib do Node e reduzimos o XML a texto —
 * parágrafos viram quebras de linha, que é o que o editor de modelos e o
 * gerador de PDF entendem.
 */

/** Localiza uma entrada no ZIP e devolve o conteúdo descomprimido. */
function lerEntradaZip(buf: Buffer, nome: string): Buffer | null {
  // End of Central Directory: assinatura 0x06054b50, procurada do fim
  // (o comentário do ZIP pode ocupar até 64 KB depois dela)
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const total = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16); // início do diretório central

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) return null;
    const metodo = buf.readUInt16LE(pos + 10);
    const tamComprimido = buf.readUInt32LE(pos + 20);
    const nomeLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const comentLen = buf.readUInt16LE(pos + 32);
    const offsetLocal = buf.readUInt32LE(pos + 42);
    const nomeEntrada = buf.toString("utf8", pos + 46, pos + 46 + nomeLen);

    if (nomeEntrada === nome) {
      // Cabeçalho local repete nome/extra com tamanhos próprios
      const localNomeLen = buf.readUInt16LE(offsetLocal + 26);
      const localExtraLen = buf.readUInt16LE(offsetLocal + 28);
      const inicio = offsetLocal + 30 + localNomeLen + localExtraLen;
      const dados = buf.subarray(inicio, inicio + tamComprimido);
      if (metodo === 0) return Buffer.from(dados); // armazenado sem compressão
      if (metodo === 8) return inflateRawSync(dados); // DEFLATE
      return null;
    }
    pos += 46 + nomeLen + extraLen + comentLen;
  }
  return null;
}

const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
};

function decodificarEntidades(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTIDADES[code] ?? m;
  });
}

/**
 * Texto de um .docx: parágrafos (`<w:p>`) viram linhas, quebras manuais
 * (`<w:br/>`) também; o resto do XML é descartado. Retorna null se o
 * arquivo não for um .docx legível.
 */
export function extrairTextoDocx(bytes: Buffer): string | null {
  const xml = lerEntradaZip(bytes, "word/document.xml");
  if (!xml) return null;

  const doc = xml.toString("utf8");
  const linhas: string[] = [];
  // Cada parágrafo do Word é um <w:p>...</w:p>
  const paragrafos = doc.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  for (const p of paragrafos) {
    // Quebra manual e tab ficam FORA das tags de texto — viram <w:t> para a
    // extração abaixo capturá-las na posição certa.
    const comQuebras = p
      .replace(/<w:br\s*\/?>/g, "<w:t>\n</w:t>")
      .replace(/<w:tab\s*\/?>/g, "<w:t>\t</w:t>");
    const trechos = [...comQuebras.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) =>
      decodificarEntidades(m[1])
    );
    let textoP = trechos.join("");

    /* Layout do arquivo preservado: parágrafo com estilo de título
       (Heading/Título) ou todo em negrito vira título de seção — o marcador
       "## " é o que o gerador entende (e o admin pode ajustar no editor). */
    if (textoP.trim()) {
      const temEstiloTitulo = /<w:pStyle\s[^>]*w:val="(?:Heading|Ttulo|Titulo|Title)[^"]*"/i.test(p);
      const runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? [];
      const runsComTexto = runs.filter((r) => /<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/.test(r));
      const todoNegrito =
        runsComTexto.length > 0 && runsComTexto.every((r) => /<w:b\s*(?:\/>|w:val="(?!0|false)[^"]*")/.test(r));
      const curto = textoP.trim().length <= 90 && !/\n/.test(textoP);
      if ((temEstiloTitulo || todoNegrito) && curto) textoP = `## ${textoP.trim()}`;
    }
    linhas.push(textoP);
  }
  // Cada <w:p> é um parágrafo de verdade → linha em branco entre eles, que é
  // como o editor de modelos separa parágrafos; vazios consecutivos colapsam.
  const texto = linhas.join("\n\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return texto || null;
}
