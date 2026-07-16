/**
 * Marca FortGrow — monograma "FG" oficial em vetor.
 * F cinza com haste afilada + G azul com divisão diagonal, fiel à logo da agência.
 */
export function FgMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FortGrow"
    >
      <defs>
        <linearGradient id="fg-gray" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9aa0a8" />
          <stop offset="1" stopColor="#565b63" />
        </linearGradient>
        <linearGradient id="fg-blue" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2d7ef2" />
          <stop offset="1" stopColor="#1252cc" />
        </linearGradient>
      </defs>
      {/* F cinza: barra superior, braço central e haste que afina até a ponta */}
      <path fill="url(#fg-gray)" d="M8 8 L55 8 L49 22 L26 22 L22 38 L40 38 L35 50 L17 50 L8 112 Z" />
      {/* G azul: barra superior */}
      <path fill="url(#fg-blue)" d="M61 8 L112 8 L112 22 L55 22 Z" />
      {/* G azul: barra interna + haste direita + barra inferior */}
      <path fill="url(#fg-blue)" d="M47 38 L112 38 L112 92 L24 92 L30 78 L98 78 L98 50 L42 50 Z" />
    </svg>
  );
}

/** Wordmark FORTGROW — FORT em cinza, GROW em azul (cores oficiais). */
export function FgWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-black tracking-tight text-slate-300">FORT</span>
      <span className="font-black tracking-tight text-[#2d7ef2]">GROW</span>
    </span>
  );
}
