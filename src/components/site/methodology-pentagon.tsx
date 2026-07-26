"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BrainCircuit,
  Clapperboard,
  MessageSquare,
  Rocket,
  Settings,
  TrendingUp,
  X,
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
  /** ângulo do chip (ícone) sobre a camada */
  chipAngle: number;
  /** explicação exibida no card ao clicar no ícone */
  description: string;
  /** versão maior do ícone, usada no card */
  bigIcon: ReactNode;
};

/* Do centro para fora: mais externa = mais lenta e mais “ao fundo”. */
const LAYERS: Layer[] = [
  {
    key: "performance",
    bigIcon: <Rocket size={22} />,
    description: "Acompanhamos CAC, CPL, ROAS e receita em tempo real. Cada real investido é medido, para você saber exatamente o retorno de cada campanha — e decidir com números, não com achismo.",
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
    bigIcon: <Settings size={22} />,
    description: "Campanhas de Meta e Google Ads geridas com foco em custo por lead e em venda. Segmentação precisa para levar sua mensagem a quem realmente tem potencial de compra.",
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
    bigIcon: <TrendingUp size={22} />,
    description: "Testes e ajustes constantes: cortamos o que não performa e escalamos o que dá resultado. Melhoria contínua, mês após mês, para o custo cair e o retorno subir.",
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
    bigIcon: <MessageSquare size={22} />,
    description: "Definimos a voz, a mensagem e o posicionamento único da sua marca — para que ela seja lembrada e reconhecida como autoridade no seu mercado.",
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
    bigIcon: <BrainCircuit size={22} />,
    description: "Mergulhamos no seu negócio, mercado e concorrência para mapear seu público ideal e desenhar o plano de crescimento antes de investir o primeiro real em mídia.",
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
    bigIcon: <Clapperboard size={22} />,
    description: "Produção de vídeo e foto com padrão estético de cinema e engenharia de retenção: roteiros com gancho nos 3 primeiros segundos, direção de postura e edição dinâmica.",
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
  /** camada com o card aberto (clique no ícone) */
  const [openLayer, setOpenLayer] = useState<number | null>(null);

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
    if (openLayer !== null) return; // com o card aberto, o destaque fica travado
    setActive((prev) => (prev === i ? prev : i));
    animRefs.current.forEach((anim, idx) => {
      if (!anim) return;
      // a camada sob o cursor desacelera; as outras seguem no ritmo normal
      anim.updatePlaybackRate(i === idx ? 0.22 : 1);
    });
  }

  /** Abre/fecha o card da camada. Enquanto aberto, ela para de girar. */
  function toggleCard(i: number | null) {
    setOpenLayer(i);
    setActive(i);
    animRefs.current.forEach((anim, idx) => {
      if (!anim) return;
      if (i === null) anim.updatePlaybackRate(1);
      else anim.updatePlaybackRate(idx === i ? 0 : 1);
    });
  }

  /* Fecha o card com ESC */
  useEffect(() => {
    if (openLayer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLayer]);

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
        onClick={() => {
          if (openLayer !== null) toggleCard(null);
          else if (active !== null) toggleCard(active);
        }}
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
                <button
                  type="button"
                  aria-label={layer.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCard(openLayer === i ? null : i);
                  }}
                  className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border transition-all duration-300"
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
                </button>
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

      {/* Card da etapa — abaixo do pentágono, sem cobrir as camadas */}
      <div className="mt-6 min-h-[112px]">
        {openLayer === null ? (
          <div className="flex h-12 items-center justify-center">
            {active === null ? (
              <p className="text-center text-xs text-slate-500">
                Clique em um ícone para ver a etapa
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
        ) : (
          <div
            role="dialog"
            aria-label={LAYERS[openLayer].label}
            className="relative animate-fade-up rounded-2xl p-5 text-left sm:p-6"
            style={{
              background: `linear-gradient(160deg, ${LAYERS[openLayer].color}24, rgba(5,9,15,0.92) 60%)`,
              border: `1px solid ${LAYERS[openLayer].color}`,
              boxShadow: `0 0 34px -10px ${LAYERS[openLayer].color}`,
            }}
          >
            <button
              type="button"
              onClick={() => toggleCard(null)}
              aria-label="Fechar"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `${LAYERS[openLayer].color}22`,
                  border: `1px solid ${LAYERS[openLayer].color}66`,
                  color: LAYERS[openLayer].color,
                  boxShadow: `0 0 18px -4px ${LAYERS[openLayer].color}`,
                }}
              >
                {LAYERS[openLayer].bigIcon}
              </span>
              <div className="min-w-0">
                <h3 className="pr-6 text-lg font-bold text-white">{LAYERS[openLayer].label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  {LAYERS[openLayer].description}
                </p>
                <p
                  className="mt-3 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: LAYERS[openLayer].color }}
                >
                  Camada {openLayer + 1} de {LAYERS.length} · Metodologia FortGrow
                </p>
              </div>
            </div>
          </div>
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
