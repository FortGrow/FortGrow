/**
 * Leitura do PDF de planejamento.
 *
 * Um planejamento de marketing não tem formato padrão — cada consultor
 * escreve do seu jeito. Por isso a leitura é feita em duas camadas:
 *
 *  1. **Heurística** (sempre roda): procura seções por título (Objetivos,
 *     Conteúdo, Roteiro, Calendário…) e datas soltas no texto. Funciona sem
 *     depender de nada externo e é o que garante que o recurso nunca fica
 *     "fora do ar".
 *  2. **IA** (quando `OPENAI_API_KEY` existe): manda o texto e pede a mesma
 *     estrutura em JSON. Lê planejamentos escritos em prosa, que a
 *     heurística não alcança.
 *
 * Em qualquer falha da IA — chave inválida, timeout, JSON quebrado — o
 * resultado da heurística é usado. O admin sempre revisa antes de publicar,
 * então o pior caso é uma leitura parcial, nunca um dado errado no portal.
 */

export type PlanoLido = {
  objetivos: string[];
  conteudos: { titulo: string; descricao?: string }[];
  roteiros: { titulo: string; texto: string }[];
  calendario: { data: string; titulo: string; formato?: string; roteiro?: string }[];
  /** Resumo em uma frase, para o cliente entender o plano de relance */
  resumo: string;
};

export const PLANO_VAZIO: PlanoLido = {
  objetivos: [],
  conteudos: [],
  roteiros: [],
  calendario: [],
  resumo: "",
};

/** Formatos de post reconhecidos no texto. */
const FORMATOS = ["Reels", "Carrossel", "Story", "Stories", "Feed", "Live", "Vídeo", "Video", "Post", "Short"];

const MESES: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Títulos que abrem cada seção. A ordem importa: "calendário de conteúdo"
 * precisa cair em calendário, não em conteúdo, então o teste é feito na
 * ordem em que as chaves aparecem aqui.
 */
const SECOES: { chave: keyof PlanoLido; termos: string[] }[] = [
  { chave: "calendario", termos: ["calendario", "cronograma", "agenda de post", "grade de public", "planner"] },
  { chave: "roteiros", termos: ["roteiro", "script", "storytelling"] },
  { chave: "objetivos", termos: ["objetivo", "meta", "kpi", "resultado esperado", "onde queremos chegar"] },
  { chave: "conteudos", termos: ["conteudo", "pauta", "tema", "pilares", "linha editorial"] },
];

/** Quebra o texto em blocos por título de seção. */
function fatiar(texto: string): Record<string, string> {
  const linhas = texto.split(/\r?\n/);
  const blocos: Record<string, string[]> = {};
  let atual: string | null = null;

  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa) continue;

    // Título curto o bastante para ser cabeçalho, e que casa com uma seção
    if (limpa.length <= 80) {
      const chave = SECOES.find((s) => s.termos.some((t) => semAcento(limpa).includes(t)))?.chave;
      if (chave) {
        atual = chave;
        blocos[atual] ??= [];
        continue;
      }
    }
    if (atual) (blocos[atual] ??= []).push(limpa);
  }

  return Object.fromEntries(Object.entries(blocos).map(([k, v]) => [k, v.join("\n")]));
}

/** Itens de lista: linhas com marcador, numeradas, ou frases curtas soltas. */
function itens(bloco: string | undefined, max = 30): string[] {
  if (!bloco) return [];
  return bloco
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•▪·*–—]\s*|^\s*\d+[.)]\s*/, "").trim())
    .filter((l) => l.length >= 3 && l.length <= 300)
    .slice(0, max);
}

/**
 * Datas no texto: 05/08, 05/08/2026, "05 de agosto", "5 ago".
 * O ano é inferido quando ausente — planejamento costuma ser do ano corrente
 * ou do próximo, então uma data já passada há mais de 6 meses vira ano que vem.
 */
function acharData(linha: string, hoje = new Date()): Date | null {
  const numerica = linha.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (numerica) {
    const dia = Number(numerica[1]);
    const mes = Number(numerica[2]) - 1;
    let ano = numerica[3] ? Number(numerica[3]) : hoje.getFullYear();
    if (ano < 100) ano += 2000;
    if (dia < 1 || dia > 31 || mes < 0 || mes > 11) return null;
    const d = new Date(ano, mes, dia, 12);
    if (!numerica[3] && d.getTime() < hoje.getTime() - 180 * 86400000) d.setFullYear(ano + 1);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const extenso = semAcento(linha).match(/\b(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/);
  if (extenso) {
    const dia = Number(extenso[1]);
    const mes = MESES[extenso[2]];
    const d = new Date(hoje.getFullYear(), mes, dia, 12);
    if (d.getTime() < hoje.getTime() - 180 * 86400000) d.setFullYear(hoje.getFullYear() + 1);
    return d;
  }
  return null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Leitura por regras — sempre executada, é o piso de qualidade. */
export function lerPorHeuristica(texto: string): PlanoLido {
  const blocos = fatiar(texto);

  const objetivos = itens(blocos.objetivos, 12);
  const conteudos = itens(blocos.conteudos, 24).map((t) => {
    // "Educacional - como funciona…" → título + descrição. Hífen simples entra
    // aqui porque é o separador que mais aparece em planejamento escrito em pt-BR.
    const [titulo, ...resto] = t.split(/\s+[–—-]\s+|\s*:\s+/);
    return { titulo: titulo.trim(), descricao: resto.join(" — ").trim() || undefined };
  });

  const roteiros: { titulo: string; texto: string }[] = [];
  if (blocos.roteiros) {
    // Cada roteiro começa numa linha curta (o título) e segue nos parágrafos
    let atual: { titulo: string; texto: string[] } | null = null;
    for (const linha of blocos.roteiros.split(/\r?\n/)) {
      const l = linha.trim();
      if (!l) continue;
      const pareceTitulo = l.length <= 70 && !/[.!?]$/.test(l);
      if (pareceTitulo && (!atual || atual.texto.length > 0)) {
        if (atual) roteiros.push({ titulo: atual.titulo, texto: atual.texto.join("\n") });
        atual = { titulo: l.replace(/^[-•*\d.)\s]+/, ""), texto: [] };
      } else if (atual) atual.texto.push(l);
    }
    if (atual) roteiros.push({ titulo: atual.titulo, texto: atual.texto.join("\n") });
  }

  // O calendário pode estar na sua seção ou espalhado: varre o texto inteiro
  const fonteCalendario = blocos.calendario || texto;
  const calendario: PlanoLido["calendario"] = [];
  for (const linha of fonteCalendario.split(/\r?\n/)) {
    const l = linha.trim();
    if (l.length < 5 || l.length > 240) continue;
    const data = acharData(l);
    if (!data) continue;

    const formato = FORMATOS.find((f) => semAcento(l).includes(semAcento(f)));
    let titulo = l
      .replace(/\b\d{1,2}[/\-.]\d{1,2}(?:[/\-.]\d{2,4})?\b/, "")
      .replace(/\b\d{1,2}\s*(?:de\s+)?[a-zç]+\b/i, (m) => (acharData(m) ? "" : m))
      .replace(/^[\s\-–—:•*|]+|[\s\-–—:•*|]+$/g, "")
      .trim();
    // O formato já vai em coluna própria; repeti-lo no título polui o calendário
    if (formato) {
      titulo = titulo
        .replace(new RegExp(`^${formato}\\b[\\s\\-–—:|]*`, "i"), "")
        .replace(/^[\s\-–—:•*|]+/, "")
        .trim();
    }

    calendario.push({
      data: iso(data),
      titulo: titulo || "Publicação",
      formato: formato ? (formato === "Video" ? "Vídeo" : formato === "Stories" ? "Story" : formato) : undefined,
    });
  }

  // Mesma data + mesmo título = linha repetida na quebra de página do PDF
  const vistos = new Set<string>();
  const calendarioUnico = calendario.filter((c) => {
    const k = `${c.data}|${semAcento(c.titulo)}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  return {
    objetivos,
    conteudos,
    roteiros: roteiros.filter((r) => r.titulo),
    calendario: calendarioUnico.sort((a, b) => a.data.localeCompare(b.data)).slice(0, 120),
    resumo: resumir(objetivos, conteudos.length, calendarioUnico.length),
  };
}

function resumir(objetivos: string[], conteudos: number, posts: number): string {
  const partes: string[] = [];
  if (objetivos.length) partes.push(`${objetivos.length} objetivo(s)`);
  if (conteudos) partes.push(`${conteudos} tema(s) de conteúdo`);
  if (posts) partes.push(`${posts} publicação(ões) no calendário`);
  return partes.length ? `Planejamento com ${partes.join(", ")}.` : "";
}

/**
 * Leitura por IA. Devolve `null` (e não lança) em qualquer problema — quem
 * chama já tem o resultado da heurística em mãos.
 */
export async function lerPorIA(texto: string): Promise<PlanoLido | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Recorte generoso mas limitado: planejamentos longos estouram o contexto
  const trecho = texto.slice(0, 24000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você lê planejamentos de marketing e devolve os dados estruturados. " +
              "Responda SOMENTE um JSON com as chaves: objetivos (array de strings), " +
              "conteudos (array de {titulo, descricao}), roteiros (array de {titulo, texto}), " +
              "calendario (array de {data no formato AAAA-MM-DD, titulo, formato, roteiro}) e " +
              "resumo (uma frase em pt-BR). Não invente nada que não esteja no texto: " +
              "campos sem informação ficam vazios. Datas sem ano assumem o ano corrente.",
          },
          { role: "user", content: trecho },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const bruto = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    return normalizar(bruto);
  } catch {
    return null;
  }
}

/** Blinda o que veio da IA: tipos, tamanhos e datas válidas. */
function normalizar(o: unknown): PlanoLido {
  const d = (o ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const txt = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  return {
    objetivos: arr(d.objetivos).map((x) => txt(x)).filter(Boolean).slice(0, 20),
    conteudos: arr(d.conteudos)
      .map((x) => {
        const c = (x ?? {}) as Record<string, unknown>;
        return { titulo: txt(c.titulo, 160), descricao: txt(c.descricao, 600) || undefined };
      })
      .filter((c) => c.titulo)
      .slice(0, 40),
    roteiros: arr(d.roteiros)
      .map((x) => {
        const r = (x ?? {}) as Record<string, unknown>;
        return { titulo: txt(r.titulo, 160), texto: txt(r.texto, 4000) };
      })
      .filter((r) => r.titulo)
      .slice(0, 40),
    calendario: arr(d.calendario)
      .map((x) => {
        const c = (x ?? {}) as Record<string, unknown>;
        const data = txt(c.data, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(new Date(data).getTime())) return null;
        return {
          data,
          titulo: txt(c.titulo, 200) || "Publicação",
          formato: txt(c.formato, 30) || undefined,
          roteiro: txt(c.roteiro, 4000) || undefined,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 200),
    resumo: txt(d.resumo, 400),
  };
}

/**
 * Leitura final: tenta a IA, cai na heurística.
 *
 * Quando a IA responde mas deixa o calendário vazio e a heurística achou
 * datas, as duas são combinadas — é o caso comum de planejamento com o
 * cronograma numa tabela, que a extração de texto entrega bagunçada para o
 * modelo mas ainda contém as datas.
 */
export async function lerPlanejamento(
  texto: string
): Promise<{ plano: PlanoLido; metodo: "IA" | "HEURISTICA" }> {
  const heuristica = lerPorHeuristica(texto);
  const ia = await lerPorIA(texto);
  if (!ia) return { plano: heuristica, metodo: "HEURISTICA" };

  return {
    plano: {
      ...ia,
      calendario: ia.calendario.length ? ia.calendario : heuristica.calendario,
      objetivos: ia.objetivos.length ? ia.objetivos : heuristica.objetivos,
      resumo: ia.resumo || heuristica.resumo,
    },
    metodo: "IA",
  };
}
