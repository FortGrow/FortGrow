/**
 * Cor por assunto dos treinamentos: determinística a partir do nome da
 * categoria, então o mesmo assunto tem sempre a mesma cor em qualquer tela.
 * Módulo puro — usável em server e client.
 */

export const CATEGORY_PALETTE = [
  "#0284c7", // azul
  "#059669", // verde
  "#8b5cf6", // violeta
  "#d97706", // âmbar
  "#e11d48", // rosa
  "#06b6d4", // ciano
  "#6366f1", // índigo
  "#f59e0b", // laranja
] as const;

export function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}
