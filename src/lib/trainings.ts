/**
 * Cor por assunto dos treinamentos. As cores são atribuídas pela posição na
 * lista ordenada de assuntos existentes (não por hash), garantindo tons bem
 * diferentes entre os assuntos exibidos juntos — e estáveis entre telas,
 * já que todas derivam da mesma lista. Módulo puro (server e client).
 */

export const CATEGORY_PALETTE = [
  "#0284c7", // azul
  "#e11d48", // rosa
  "#059669", // verde
  "#8b5cf6", // violeta
  "#f59e0b", // âmbar
  "#06b6d4", // ciano
  "#d946ef", // fúcsia
  "#84cc16", // lima
] as const;

export function categoryColorMap(categories: string[]): Record<string, string> {
  const sorted = [...new Set(categories)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return Object.fromEntries(sorted.map((c, i) => [c, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]]));
}
