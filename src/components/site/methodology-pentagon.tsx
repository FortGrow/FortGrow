"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BrainCircuit,
  Clapperboard,
  MessageSquare,
  Rocket,
  Settings,
  TrendingUp,
} from "lucide-react";
import { FgMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Pentágono em camadas — metodologia da FortGrow.
 *
 * Núcleo com a marca e 6 pentágonos concêntricos. Cada camada carrega o
 * próprio conteúdo (ícone, nome e ponto luminoso) preso à camada, gira de
 * forma independente, alternando sentido e ficando mais lenta quanto mais
 * externa. No hover, a camada desacelera suavemente (playbackRate da Web
 * Animations API, sem "pulo"), o brilho intensifica e um feixe de energia
 * percorre o contorno — sem afetar as demais camadas.
 */

type Layer = {
  key: string;
  label: string;
  short: string;
  icon: ReactNode;
  /** raio do pentágono, em % da metade do container */
  radius: number;
  /** duração de uma volta, em segundos */
  duration: number;
  /** true = anti-horário */
  reverse: boolean;
  color: string;
  /** profundidade: leve escala (planos diferentes) */
  scale: number;
  /** ângulo do chip (ícone + nome) sobre a camada */
  chipAngle: number;
};

/* Do centro para fora: mais externa = mais lenta e mais “ao fundo”. */
const LAYERS: Layer[] = [
  {
    key: "performance",
    label: "Performance & ROI",
    short: "Performance",
    icon: <Rocket size={12} />,
    radius: 11,
    duration: 18,
    reverse: false,
    color: "#67e8f9",
    scale: 1.05,
    chipAngle: -90,
  },
  {
    key: "trafego",
    label: "Tráfego Pago",
    short: "Tráfego",
    icon: <Settings size={12} />,
    radius: 18.1,
    duration: 24,
    reverse: true,
    color: "#22d3ee",
    scale: 1.035,
    chipAngle: -18,
  },
  {
    key: "otimizacao",
    label: "Otimização Contínua",
    short: "Otimização",
    icon: <TrendingUp size={12} />,
    radius: 25.2,
    duration: 30,
    reverse: false,
    color: "#38bdf8",
    scale: 1.02,
    chipAngle: 54,
  },
  {
    key: "posicionamento",
    label: "Posicionamento & Narrativa",
    short: "Narrativa",
    icon: <MessageSquare size={12} />,
    radius: 32.3,
    duration: 36,
    reverse: true,
    color: "#60a5fa",
    scale: 1.005,
    chipAngle: 126,
  },
  {
    key: "diagnostico",
    label: "Diagnóstico Estratégico",
    short: "Diagnóstico",
    icon: <BrainCircuit size={12} />,
    radius: 39.4,
    duration: 42,
    reverse: false,
    color: "#3b82f6",
    scale: 0.992,
    chipAngle: 198,
  },
  {
    key: "audiovisual",
    label: "Audiovisual Estratégico",
    short: "Audiovisual",
    icon: <Clapperboard size={12} />,
    radius: 46.5,
    duration: 48,
    reverse: true,
    color: "#2d7ef2",
    scale: 0.98,
    chipAngle: 270,
  },
];

/** Vértices do pentágono (viewBox 0 0 100 100, centro 50,50). */
function pentagonPoints(r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(3)},${(50 + r * Math.sin(a)).toFixed(3)}`;
  }).join(" ");
}

/** Coordenada polar em % do container. */
function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

/* Partículas do fundo (posições fixas — sem custo de random no cliente) */
const PARTICLES = [
  { x: 12, y: 22, d: 0 },
  { x: 84, y: 16, d: 1.4 },
  { x: 92, y: 62, d: 2.6 },
  { x: 8, y: 70, d: 0.8 },
  { x: 30, y: 90, d: 3.4 },
  { x: 68, y: 88, d: 2.1 },
  { x: 50, y: 8, d: 4.2 },
  { x: 22, y: 48, d: 1.9 },
];

export function MethodologyPentagon() {
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animRefs = useRef<(Animation | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);

  /* Rotação via Web Animations API: permite mudar a velocidade no hover
     sem cortes (updatePlaybackRate preserva a posição atual). */
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const anims: (Animation | null)[] = [];
    LAYERS.forEach((layer, i) => {
      const el = trackRefs.current[i];
      if (!el) {
        anims[i] = null;
        return;
      }
      const anim = el.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        {
          duration: layer.duration * 1000,
          iterations: Infinity,
          easing: "linear",
          direction: layer.reverse ? "reverse" : "normal",
        },
      );
      anims[i] = anim;
    });
    animRefs.current = anims;
    return () => anims.forEach((a) => a?.cancel());
  }, []);

  function focusLayer(i: number | null) {
    setActive((prev) => (prev === i ? prev : i));
    animRefs.current.forEach((anim, idx) => {
      if (!anim) return;
      // a camada sob o cursor desacelera; as outras seguem no ritmo normal
      anim.updatePlaybackRate(i === idx ? 0.22 : 1);
    });
  }

  /**
   * Qual camada está sob o cursor: como os pentágonos são concêntricos, a
   * distância até o centro já identifica o anel. Bem mais confiável (e
   * agradável) do que tentar acertar um elemento pequeno em movimento.
   */
  function onStageMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const half = rect.width / 2;
    const dx = e.clientX - (rect.left + half);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const rPct = (Math.hypot(dx, dy) / half) * 50; // mesma escala dos raios (% do viewBox)
    let best: number | null = null;
    let bestDist = Infinity;
    LAYERS.forEach((l, i) => {
      const d = Math.abs(rPct - l.radius);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    focusLayer(bestDist <= 3.4 ? best : null);
  }

  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      {/* fundo: luz ambiente + grade + partículas */}
      <div aria-hidden className="pointer-events-none absolute inset-[-18%]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(45,126,242,0.16), transparent 62%)," +
              "radial-gradient(circle at 30% 25%, rgba(34,211,238,0.10), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(circle at 50% 50%, black, transparent 72%)",
          }}
        />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="pent-particle absolute h-1 w-1 rounded-full bg-cyan-300/70"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.d}s`,
              boxShadow: "0 0 8px rgba(103,232,249,0.9)",
            }}
          />
        ))}
      </div>

      {/* palco 3D */}
      <div
        className="relative aspect-square w-full"
        onMouseMove={onStageMove}
        onMouseLeave={() => focusLayer(null)}
      >
        {LAYERS.map((layer, i) => {
          const isActive = active === i;
          const chip = polar(layer.radius, layer.chipAngle);
          const point = polar(layer.radius, layer.chipAngle + 144);
          const points = pentagonPoints(layer.radius);
          return (
            <div
              key={layer.key}
              /* o container cobre todo o palco: precisa deixar o ponteiro
                 passar, senão a camada de cima intercepta o hover das outras */
              className="pointer-events-none absolute inset-0"
              /* profundidade sem 3D: escala + opacidade (composição barata) */
              style={{
                transform: `scale(${layer.scale})`,
                opacity: isActive ? 1 : 1 - i * 0.05,
                transition: "opacity 0.4s ease",
              }}
            >
              {/* trilho que gira: tudo aqui dentro acompanha a rotação */}
              <div
                ref={(el) => {
                  trackRefs.current[i] = el;
                }}
                className="pent-layer pointer-events-none absolute inset-0"
                style={{ willChange: "transform", backfaceVisibility: "hidden" }}
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
                  <defs>
                    <linearGradient id={`ps-${layer.key}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="100%" stopColor={layer.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Glow por traços empilhados (sem filtro): o navegador não
                      precisa rasterizar um blur a cada quadro — é o que
                      mantém a rotação fluida. */}
                  <polygon
                    points={points}
                    fill="none"
                    stroke={layer.color}
                    strokeWidth={isActive ? 3.4 : 2.4}
                    strokeLinejoin="round"
                    opacity={isActive ? 0.20 : 0.10}
                    style={{ transition: "stroke-width 0.35s ease, opacity 0.35s ease" }}
                  />
                  <polygon
                    points={points}
                    fill="none"
                    stroke={layer.color}
                    strokeWidth={isActive ? 1.7 : 1.15}
                    strokeLinejoin="round"
                    opacity={isActive ? 0.5 : 0.3}
                    style={{ transition: "stroke-width 0.35s ease, opacity 0.35s ease" }}
                  />
                  {/* contorno nítido */}
                  <polygon
                    points={points}
                    fill="none"
                    stroke={layer.color}
                    strokeWidth={isActive ? 0.6 : 0.38}
                    strokeLinejoin="round"
                    opacity={isActive ? 1 : 0.85}
                    style={{ transition: "stroke-width 0.35s ease, opacity 0.35s ease" }}
                  />
                  {/* feixe de energia (hover) */}
                  <polygon
                    points={points}
                    pathLength={100}
                    fill="none"
                    stroke={`url(#ps-${layer.key})`}
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    className={cn("pent-sweep", isActive && "pent-sweep-on")}
                  />
                </svg>

                {/* ponto luminoso da camada (halo + núcleo branco) */}
                <span
                  aria-hidden
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: isActive ? 22 : 16,
                    height: isActive ? 22 : 16,
                    background: `radial-gradient(circle, #ffffff 0%, #ffffff 22%, ${layer.color} 42%, ${layer.color}00 72%)`,
                    boxShadow: `0 0 ${isActive ? 26 : 16}px ${layer.color}, 0 0 ${isActive ? 52 : 30}px ${layer.color}90`,
                  }}
                />

                {/* chip: ícone + nome, presos à camada (giram junto) */}
                {/* badge só com o ícone — o nome aparece na legenda central
                    ao passar o mouse (assim o texto nunca gira de cabeça pra baixo) */}
                <div
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300"
                  style={{
                    left: `${chip.x}%`,
                    top: `${chip.y}%`,
                    width: isActive ? 30 : 24,
                    height: isActive ? 30 : 24,
                    borderColor: isActive ? layer.color : `${layer.color}66`,
                    background: isActive ? `${layer.color}2e` : "rgba(6,11,20,0.92)",
                    boxShadow: isActive ? `0 0 22px ${layer.color}80` : `0 0 10px ${layer.color}30`,
                    color: layer.color,
                  }}
                >
                  <span
                    className="transition-transform duration-300"
                    style={{ transform: isActive ? "scale(1.25)" : "scale(1)" }}
                  >
                    {layer.icon}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* núcleo: só a marca */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden
              className="pent-core-halo absolute h-[86px] w-[86px] rounded-full sm:h-[110px] sm:w-[110px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(45,126,242,0.45) 0%, rgba(34,211,238,0.18) 45%, transparent 70%)",
              }}
            />
            <FgMark
              size={46}
              className="relative drop-shadow-[0_0_22px_rgba(45,126,242,0.9)] sm:hidden"
            />
            <FgMark
              size={64}
              className="relative hidden drop-shadow-[0_0_26px_rgba(45,126,242,0.9)] sm:block"
            />
          </div>
        </div>
      </div>

      {/* Nome da camada sob o cursor — sempre na horizontal, legível.
          Altura fixa para a seção não "pular" ao entrar/sair do hover. */}
      <div className="mt-6 flex h-12 items-center justify-center">
        {active === null ? (
          <p className="text-center text-xs text-slate-500">
            Passe o mouse por uma camada para ver a etapa
          </p>
        ) : (
          <span
            className="inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-bold transition-all duration-300"
            style={{
              borderColor: LAYERS[active].color,
              background: `${LAYERS[active].color}1f`,
              color: LAYERS[active].color,
              boxShadow: `0 0 26px -6px ${LAYERS[active].color}`,
            }}
          >
            {LAYERS[active].icon}
            {LAYERS[active].label}
          </span>
        )}
      </div>

      {/* legenda compacta no celular (sem hover) */}
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:hidden">
        {LAYERS.map((l) => (
          <li key={l.key} className="flex items-center gap-2 text-[11px] text-slate-400">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }}
            />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
