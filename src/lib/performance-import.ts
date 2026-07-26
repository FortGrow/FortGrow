/**
 * Lógica de importação de relatórios de campanha (.xlsx) para as métricas do
 * cliente. Módulo puro (sem React/Next) — faz o "de-para" das colunas do
 * Excel para os campos internos, converte os valores (datas e números no
 * formato brasileiro) e valida cada linha.
 *
 * Os campos internos são exatamente os já existentes em PerformanceEntry, então
 * a gravação reutiliza a API atual (POST /api/performance). Para suportar um
 * novo campo no futuro, basta adicioná-lo em IMPORT_FIELDS com seus apelidos.
 */

export type ImportFieldKey =
  | "date"
  | "investment"
  | "leads"
  | "sales"
  | "revenue"
  | "views"
  | "reach"
  | "clicks"
  | "interactions"
  | "profileVisits"
  | "campaign"
  | "campaignType"
  | "source";

type FieldKind = "date" | "int" | "money" | "text" | "campaignType" | "source";

export type ImportField = {
  key: ImportFieldKey;
  label: string;
  kind: FieldKind;
  /** Nomes de coluna aceitos (base do matching, além da comparação fuzzy). */
  aliases: string[];
};

/**
 * Definição dos campos importáveis. A ordem é a que aparece na prévia.
 * `aliases` pode crescer à vontade — o matching também tolera pequenas
 * diferenças (acentos, plural, erros de digitação) via similaridade.
 */
export const IMPORT_FIELDS: ImportField[] = [
  { key: "date", label: "Data", kind: "date", aliases: ["data", "dia", "date", "day"] },
  {
    key: "investment",
    label: "Investimento",
    kind: "money",
    aliases: ["valor gasto", "investimento", "gasto", "custo", "verba", "spend", "amount spent", "valor investido", "valor usado"],
  },
  { key: "leads", label: "Leads", kind: "int", aliases: ["leads", "lead", "cadastros", "resultados de leads"] },
  {
    key: "sales",
    label: "Conversões / Vendas",
    kind: "int",
    aliases: ["conversoes", "conversao", "conversions", "vendas", "compras", "purchases", "sales", "vendas realizadas"],
  },
  {
    key: "revenue",
    label: "Receita",
    kind: "money",
    aliases: ["receita", "faturamento", "revenue", "valor de conversao", "valor de conversoes", "conversion value", "purchase value", "valor das vendas"],
  },
  {
    key: "views",
    label: "Impressões",
    kind: "int",
    aliases: ["impressoes", "impressions", "impressao", "visualizacoes", "visualizacao", "views", "exibicoes"],
  },
  { key: "reach", label: "Alcance", kind: "int", aliases: ["alcance", "reach", "pessoas alcancadas"] },
  { key: "clicks", label: "Cliques", kind: "int", aliases: ["cliques", "clicks", "cliques no link", "link clicks", "cliques totais"] },
  {
    key: "interactions",
    label: "Interações",
    kind: "int",
    aliases: ["interacoes", "interacao", "interactions", "engajamento", "engagement", "envolvimento"],
  },
  {
    key: "profileVisits",
    label: "Visitas ao perfil",
    kind: "int",
    aliases: ["visitas ao perfil", "visitas no perfil", "visitas de perfil", "profile visits", "visitas ao perfil do instagram"],
  },
  { key: "campaign", label: "Campanha", kind: "text", aliases: ["campanha", "campaign", "nome da campanha", "campaign name"] },
  { key: "campaignType", label: "Tipo de campanha", kind: "campaignType", aliases: ["tipo", "objetivo", "tipo de campanha", "objective", "objetivo da campanha"] },
  { key: "source", label: "Origem", kind: "source", aliases: ["origem", "source", "canal", "fonte"] },
];

/** Métricas derivadas (calculadas pelo sistema) — reconhecidas só para avisar
 * que são ignoradas na importação. */
export const DERIVED_COLUMNS = ["cpc", "cpm", "ctr", "cpa", "cpl", "roas", "roi", "frequencia", "frequency"];

export const CAMPAIGN_TYPES = ["LEADS", "VENDAS", "ENGAJAMENTO", "RECONHECIMENTO", "TRAFEGO", "OUTRO"] as const;
export const SOURCES = ["INDICACAO", "TRAFEGO_PAGO", "ORGANICO", "SOCIAL", "OUTRO"] as const;

/** Origem padrão das linhas importadas (relatórios de campanha = mídia paga). */
export const DEFAULT_IMPORT_SOURCE = "TRAFEGO_PAGO";

/** Rótulos amigáveis das origens (para exibição na prévia). */
export const SOURCE_LABELS: Record<string, string> = {
  INDICACAO: "Indicação",
  TRAFEGO_PAGO: "Tráfego pago",
  ORGANICO: "Orgânico",
  SOCIAL: "Social",
  OUTRO: "Outro",
};

/* ───────────────────────── utilidades de texto ───────────────────────── */

/** Remove acentos, pontuação e espaços extras; deixa minúsculo. */
export function normalizeHeader(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Distância de Levenshtein (para tolerar pequenas diferenças de digitação). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[n];
}

/** Similaridade 0..1 entre dois textos já normalizados. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // inclusão (uma palavra contém a outra) conta como forte, se não for curta demais
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length >= 4 && long.includes(short)) return 0.9;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

/** Melhor similaridade de um cabeçalho contra os apelidos de um campo. */
function fieldScore(headerNorm: string, field: ImportField): number {
  let best = similarity(headerNorm, normalizeHeader(field.key));
  for (const alias of field.aliases) {
    best = Math.max(best, similarity(headerNorm, normalizeHeader(alias)));
  }
  return best;
}

const MATCH_THRESHOLD = 0.8;

export type ColumnMatch = { field: ImportFieldKey; label: string; header: string; index: number; score: number };
export type MatchResult = {
  matched: ColumnMatch[];
  byField: Partial<Record<ImportFieldKey, ColumnMatch>>;
  unmatched: string[];
  derived: string[];
};

/**
 * Faz o "de-para" das colunas do Excel para os campos internos, escolhendo a
 * melhor correspondência (guloso por maior similaridade). Cada coluna vira no
 * máximo um campo e cada campo recebe no máximo uma coluna.
 */
export function matchColumns(headers: unknown[]): MatchResult {
  const norm = headers.map(normalizeHeader);
  const candidates: { field: ImportField; index: number; score: number }[] = [];
  for (let i = 0; i < norm.length; i++) {
    if (!norm[i]) continue;
    for (const field of IMPORT_FIELDS) {
      const score = fieldScore(norm[i], field);
      if (score >= MATCH_THRESHOLD) candidates.push({ field, index: i, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const usedField = new Set<ImportFieldKey>();
  const usedCol = new Set<number>();
  const matched: ColumnMatch[] = [];
  for (const c of candidates) {
    if (usedField.has(c.field.key) || usedCol.has(c.index)) continue;
    usedField.add(c.field.key);
    usedCol.add(c.index);
    matched.push({ field: c.field.key, label: c.field.label, header: String(headers[c.index]), index: c.index, score: c.score });
  }

  const byField: Partial<Record<ImportFieldKey, ColumnMatch>> = {};
  for (const m of matched) byField[m.field] = m;

  const unmatched: string[] = [];
  const derived: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (usedCol.has(i) || !norm[i]) continue;
    if (DERIVED_COLUMNS.some((d) => similarity(norm[i], d) >= 0.85)) derived.push(String(headers[i]));
    else unmatched.push(String(headers[i]));
  }

  return { matched, byField, unmatched, derived };
}

/* ───────────────────────── conversão de valores ───────────────────────── */

/** Número no formato brasileiro (ou internacional): "R$ 1.234,56", "12,5%", 1234.56… */
export function parseNumberBR(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).trim();
  if (!s) return null;
  s = s.replace(/[R$\s%]/gi, "").replace(/[^\d.,-]/g, "");
  if (!s || s === "-" || s === "." || s === ",") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // o último separador é o decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS_3: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

/** Converte a célula de data em "YYYY-MM-DD" (aceita Date, serial do Excel e texto). */
export function parseDateCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return isoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  // Serial do Excel (dias desde 1899-12-30)
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    return null;
  }

  const s = String(value).trim();
  if (!s) return null;

  // yyyy-mm-dd (ISO)
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);

  // dd/mm/yyyy ou dd-mm-yyyy (formato BR)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    const yy = +m[3];
    return isoFromParts(yy < 100 ? 2000 + yy : yy, +m[2], +m[1]);
  }

  // "15 de jan" / "15 jan 2026" / "15/jan/2026"
  m = s.toLowerCase().match(/^(\d{1,2})\s*(?:de\s*)?[\/\s-]?([a-zç]{3,})[\/\s-]*(?:de\s*)?(\d{2,4})?/);
  if (m && MONTHS_3[m[2].slice(0, 3)]) {
    const yy = m[3] ? +m[3] : new Date().getFullYear();
    return isoFromParts(yy < 100 ? 2000 + yy : yy, MONTHS_3[m[2].slice(0, 3)], +m[1]);
  }

  return null;
}

function isoFromParts(y: number, mo: number, d: number): string | null {
  if (!y || !mo || !d || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (isNaN(dt.getTime())) return null;
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/* ───────────────────────── normalização das linhas ───────────────────────── */

function mapCampaignType(raw: unknown): string | null {
  const n = normalizeHeader(raw);
  if (!n) return null;
  if (/lead|cadastro/.test(n)) return "LEADS";
  if (/venda|conversa|converso|compra|sale|purchase/.test(n)) return "VENDAS";
  if (/engaj|engagement|interac/.test(n)) return "ENGAJAMENTO";
  if (/reconhec|awareness|marca|brand|alcance/.test(n)) return "RECONHECIMENTO";
  if (/trafego|traffic|clique|link/.test(n)) return "TRAFEGO";
  return "OUTRO";
}

function mapSource(raw: unknown): string | null {
  const n = normalizeHeader(raw);
  if (!n) return null;
  if (/indicac|referral/.test(n)) return "INDICACAO";
  if (/pago|paid|ads|midia paga|trafego pago/.test(n)) return "TRAFEGO_PAGO";
  if (/organic/.test(n)) return "ORGANICO";
  if (/social|rede/.test(n)) return "SOCIAL";
  return "OUTRO";
}

/** Payload de uma linha pronto para o POST /api/performance (sem clientId). */
export type ImportPayload = {
  date: string;
  investment?: number;
  leads?: number;
  sales?: number;
  revenue?: number;
  views?: number;
  reach?: number;
  clicks?: number;
  interactions?: number;
  profileVisits?: number;
  campaign?: string;
  campaignType?: string;
  source?: string;
};

export type ImportRow = {
  rowNumber: number; // linha no Excel (cabeçalho = 1)
  payload: ImportPayload | null;
  /** Valores formatados para exibição na prévia (por campo). */
  display: Partial<Record<ImportFieldKey, string>>;
  errors: string[];
};

export type BuildResult = {
  match: MatchResult;
  rows: ImportRow[];
  validCount: number;
  errorCount: number;
  skipped: number; // linhas vazias ignoradas
};

type NumericFieldKey =
  | "investment"
  | "leads"
  | "sales"
  | "revenue"
  | "views"
  | "reach"
  | "clicks"
  | "interactions"
  | "profileVisits";

const INT_FIELDS: NumericFieldKey[] = ["leads", "sales", "views", "reach", "clicks", "interactions", "profileVisits"];
const MONEY_FIELDS: NumericFieldKey[] = ["investment", "revenue"];

function isEmptyRow(cells: unknown[]): boolean {
  return cells.every((c) => c === null || c === undefined || String(c).trim() === "");
}

/**
 * Constrói e valida as linhas de importação a partir do array-de-arrays da
 * planilha (primeira posição = cabeçalho).
 */
export function buildImportRows(aoa: unknown[][]): BuildResult {
  const headers = aoa[0] ?? [];
  const match = matchColumns(headers);

  const rows: ImportRow[] = [];
  let validCount = 0;
  let errorCount = 0;
  let skipped = 0;

  const dateCol = match.byField.date;

  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    if (isEmptyRow(cells)) {
      skipped++;
      continue;
    }
    const rowNumber = r + 1; // Excel é 1-based e a linha 1 é o cabeçalho
    const errors: string[] = [];
    const display: Partial<Record<ImportFieldKey, string>> = {};
    const payload: ImportPayload = { date: "" };

    // Data (obrigatória)
    if (!dateCol) {
      errors.push("Coluna de Data não encontrada na planilha.");
    } else {
      const iso = parseDateCell(cells[dateCol.index]);
      if (!iso) errors.push(`Data inválida ou ausente ("${cells[dateCol.index] ?? ""}").`);
      else {
        payload.date = iso;
        display.date = iso.split("-").reverse().join("/");
      }
    }

    // Números (inteiros e monetários)
    for (const key of [...INT_FIELDS, ...MONEY_FIELDS]) {
      const col = match.byField[key];
      if (!col) continue;
      const raw = cells[col.index];
      if (raw === null || raw === undefined || String(raw).trim() === "") continue;
      const n = parseNumberBR(raw);
      const label = IMPORT_FIELDS.find((f) => f.key === key)!.label;
      if (n === null) {
        errors.push(`${label}: valor inválido ("${raw}").`);
      } else if (n < 0) {
        errors.push(`${label}: não pode ser negativo (${raw}).`);
      } else if (INT_FIELDS.includes(key)) {
        const v = Math.round(n);
        payload[key] = v;
        display[key] = v.toLocaleString("pt-BR");
      } else {
        payload[key] = n;
        display[key] = n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }

    // Texto / enums
    if (match.byField.campaign) {
      const v = String(cells[match.byField.campaign.index] ?? "").trim();
      if (v) {
        payload.campaign = v.slice(0, 120);
        display.campaign = payload.campaign;
      }
    }
    if (match.byField.campaignType) {
      const t = mapCampaignType(cells[match.byField.campaignType.index]);
      if (t) {
        payload.campaignType = t;
        display.campaignType = t;
      }
    }
    // Origem: relatórios de campanha vêm de mídia paga, então o padrão da
    // importação é "Tráfego pago". Só muda se a planilha tiver uma coluna de
    // origem com outro valor reconhecível.
    payload.source = DEFAULT_IMPORT_SOURCE;
    if (match.byField.source) {
      const s = mapSource(cells[match.byField.source.index]);
      if (s) payload.source = s;
    }
    display.source = SOURCE_LABELS[payload.source] ?? payload.source;

    const ok = errors.length === 0 && payload.date;
    if (ok) validCount++;
    else errorCount++;

    rows.push({ rowNumber, payload: ok ? payload : null, display, errors });
  }

  return { match, rows, validCount, errorCount, skipped };
}
