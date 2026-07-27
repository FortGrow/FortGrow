"use client";

import { useRef, useState } from "react";
import type { TEAM } from "@/lib/site-config";

/**
 * Card 3D de integrante do time.
 *
 * O card inteiro vive num contexto de perspectiva e inclina seguindo o
 * cursor. As camadas internas ficam em planos diferentes (`translateZ`),
 * então a figura recortada e o nome flutuam à frente da superfície e se
 * deslocam em paralaxe quando o card gira — é o que dá a sensação de
 * profundidade real, e não de uma imagem plana girando.
 *
 * A inclinação só existe em ponteiro fino (mouse). No toque e para quem
 * pede menos movimento o card fica estático.
 */

type Member = (typeof TEAM)[number];

/** Ângulo máximo de inclinação, em graus. */
const MAX_TILT = 13;

export function TeamCard({ member }: { member: Member }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 0 });
  const [hover, setHover] = useState(false);
  const { accent } = member;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 2 * MAX_TILT, ry: px * 2 * MAX_TILT });
    setGlare({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    setHover(true);
  }

  function onLeave() {
    setTilt({ rx: 0, ry: 0 });
    setHover(false);
  }

  return (
    <div ref={ref} className="h-full [perspective:1100px]" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div
        className="relative flex h-full flex-col rounded-2xl [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hover ? 1.02 : 1})`,
          transition: hover ? "transform 120ms ease-out" : "transform 600ms cubic-bezier(0.22,1,0.36,1)",
          willChange: hover ? "transform" : undefined,
        }}
      >
        {/* superfície do card */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl transition-shadow duration-300"
          style={{
            background: `linear-gradient(165deg, ${accent}26, rgba(255,255,255,0.02) 58%)`,
            border: `1px solid ${accent}66`,
            boxShadow: hover
              ? `0 26px 60px -24px rgba(0,0,0,0.95), 0 0 34px -10px ${accent}88, inset 0 1px 0 ${accent}33`
              : `0 16px 40px -28px rgba(0,0,0,0.9), 0 0 18px -8px ${accent}55, inset 0 1px 0 ${accent}22`,
          }}
        />

        {/* reflexo que segue o cursor */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: hover ? 1 : 0,
            background: `radial-gradient(320px circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.13), transparent 62%)`,
          }}
        />

        {/* Área da figura. É quadrada, mas a pessoa é desenhada mais alta que
            ela e ancorada na base: a cabeça e os ombros passam da borda de
            cima do card. Como nada aqui tem `overflow-hidden`, a figura
            "sai" da moldura — é o que dá o efeito de profundidade. */}
        <div className="relative aspect-square">
          {/* halo atrás da pessoa (plano do fundo) */}
          <span
            aria-hidden
            className="absolute inset-x-6 bottom-4 top-6 rounded-[50%] transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at 50% 55%, ${accent}59, ${accent}1a 45%, transparent 70%)`,
              opacity: hover ? 1 : 0.7,
              transform: "translateZ(10px)",
            }}
          />
          {/* figura recortada — plano da frente, transbordando o card */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/site/team/${member.slug}.webp`}
            alt={`${member.name} — ${member.role} da FortGrow`}
            width={760}
            height={950}
            loading="lazy"
            className="absolute bottom-0 left-1/2 h-[134%] w-auto max-w-none drop-shadow-[0_22px_30px_rgba(0,0,0,0.6)]"
            style={{ transform: `translate(-50%, 0) translateZ(${hover ? 62 : 50}px)`, transition: "transform 300ms ease-out" }}
          />
          {/* nome e cargo — plano mais à frente ainda */}
          <div
            className="absolute inset-x-0 bottom-0 px-5 pb-1 text-center"
            style={{ transform: "translateZ(78px)" }}
          >
            <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {member.name}
            </h3>
            <p
              className="mt-0.5 text-sm font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
              style={{ color: accent }}
            >
              {member.role} · FortGrow
            </p>
          </div>
        </div>

        <p
          className="relative flex-1 px-5 pb-6 pt-4 text-sm leading-relaxed text-slate-300/90"
          style={{ transform: "translateZ(26px)" }}
        >
          {member.bio}
        </p>
      </div>
    </div>
  );
}
