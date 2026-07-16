/**
 * Marca FortGrow — monograma "FG" vetorial.
 * Moldura neon azul, F em prata e G em azul, sobre fundo transparente.
 */
export function FgMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FortGrow"
    >
      <defs>
        <linearGradient id="fg-frame" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="fg-silver" x1="20" y1="30" x2="70" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="fg-blue" x1="60" y1="30" x2="115" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="fg-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Moldura com corte diagonal no canto superior esquerdo */}
      <path
        d="M40 10 H114 V118 H14 V36 Z"
        stroke="url(#fg-frame)"
        strokeWidth="5"
        strokeLinejoin="miter"
        filter="url(#fg-glow)"
      />

      {/* Monograma FG em itálico pesado */}
      <text
        x="63"
        y="88"
        textAnchor="middle"
        fontFamily="'Arial Black', 'Inter', system-ui, sans-serif"
        fontSize="56"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="-2"
      >
        <tspan fill="url(#fg-silver)">F</tspan>
        <tspan fill="url(#fg-blue)">G</tspan>
      </text>
    </svg>
  );
}

/** Wordmark FORTGROW — FORT em prata, GROW em azul. */
export function FgWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-black tracking-tight text-slate-100">FORT</span>
      <span className="bg-gradient-to-r from-brand-400 to-blue-600 bg-clip-text font-black tracking-tight text-transparent">
        GROW
      </span>
    </span>
  );
}
