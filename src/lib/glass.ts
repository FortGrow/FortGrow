/**
 * Converte a cor de uma peça no matiz do vidro (`--glass-tint`).
 *
 * O material espera um trio HSL *sem* alfa, porque cada camada aplica a
 * sua própria opacidade (`hsl(var(--glass-tint) / 0.2)`). A saturação é
 * contida e a luminosidade tem piso: vidro tingido reflete luz clara —
 * se o matiz entrasse cru, o aro viraria plástico colorido.
 */
export function hueOf(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "210 30% 62%"; // mesmo padrão do :root
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const sat = Math.min(s * 100, 58);
  const lum = Math.max(l * 100, 64);
  return `${Math.round(h)} ${Math.round(sat)}% ${Math.round(lum)}%`;
}
