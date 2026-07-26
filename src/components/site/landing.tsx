"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  Clapperboard,
  Crosshair,
  Eye,
  Film,
  Gauge,
  LineChart,
  MessageCircle,
  Mic2,
  Radar,
  Rocket,
  Scissors,
  ShieldCheck,
  Snowflake,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { FgMark } from "@/components/brand/logo";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";
import { Reveal } from "./motion";
import { ContactForm } from "./contact-form";
import { CLIENTS, SLOGAN, ctaHref } from "@/lib/site-config";

/*
 * Home institucional — identidade da apresentação oficial "Estruturação de
 * Marketing": fundo escuro esfumaçado, azul neon da logo, manchetes em caixa
 * alta com a frase-chave destacada, cards de vidro e o hexágono FG neon.
 */

/* ───────────────────────── blocos de apoio ───────────────────────── */

/** Rótulo de seção (pequeno, uppercase, azul da logo). */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7fb0f8]">{children}</p>
  );
}

/** Hexágono FG com brilho neon (marca da apresentação). */
function NeonHex({ size = 190 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <filter id="hexGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5"
          fill="rgba(5,9,15,0.9)"
          stroke="#2d7ef2"
          strokeWidth="2.2"
          filter="url(#hexGlow)"
        />
        <polygon
          points="50,10 85,30 85,70 50,90 15,70 15,30"
          fill="none"
          stroke="rgba(45,126,242,0.35)"
          strokeWidth="0.8"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <FgMark size={Math.round(size * 0.42)} className="drop-shadow-[0_0_22px_rgba(45,126,242,0.65)]" />
      </div>
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

const LOGO_SRC = "/site/estruturacao-estrategica.png";

/**
 * Logo "Estruturação Estratégica" com aspecto 3D em alto-relevo: cópias da
 * mesma arte são empilhadas atrás da principal (cada uma um pouco deslocada e
 * escurecida) formando a extrusão da costura; por cima, um brilho de luz varre
 * o relevo. Tudo em CSS — sem custo de renderização 3D.
 */
/* eslint-disable @next/next/no-img-element */
function Logo3D() {
  const DEPTH = 9; // camadas de profundidade do relevo
  return (
    <div className="logo-3d w-full max-w-[300px] sm:max-w-[420px]">
      <div className="logo-3d-stack">
        {/* camadas de extrusão (do fundo para a frente) */}
        {Array.from({ length: DEPTH }).map((_, i) => {
          const d = DEPTH - i; // 9 → 1
          return (
            <img
              key={d}
              src={LOGO_SRC}
              alt=""
              aria-hidden
              className="logo-3d-layer"
              style={{
                transform: `translate3d(${d * -0.9}px, ${d * 1.5}px, ${-d * 2}px)`,
                filter: `brightness(${0.18 + i * 0.05}) saturate(0.7)`,
                opacity: 0.92,
              }}
            />
          );
        })}
        {/* face principal + brilho */}
        <img src={LOGO_SRC} alt="Estruturação Estratégica" className="logo-3d-face w-full" />
        <span
          className="logo-3d-shine"
          style={{ ["--logo-mask" as string]: `url(${LOGO_SRC})` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/**
 * Botão "Contrate a FortGrow": ao clicar, anima um preenchimento de
 * carregamento do azul bebê para o azul escuro e então leva ao contato.
 */
function ContrateButton() {
  // O carregamento começa assim que o cursor chega no botão (hover/foco) —
  // não é preciso clicar. Ao sair, o preenchimento volta ao início.
  const [filling, setFilling] = useState(false);

  return (
    <a
      href="#contato"
      onMouseEnter={() => setFilling(true)}
      onMouseLeave={() => setFilling(false)}
      onFocus={() => setFilling(true)}
      onBlur={() => setFilling(false)}
      onTouchStart={() => setFilling(true)}
      className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#a9cdfb] px-9 py-3.5 text-base font-bold shadow-[0_6px_30px_-6px_rgba(45,126,242,0.5)] transition-transform active:scale-[0.97]"
    >
      {/* preenchimento de carregamento: azul bebê → azul escuro */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2d7ef2] to-[#123c8f] transition-[width] duration-[900ms] ease-out"
        style={{ width: filling ? "100%" : "0%" }}
      />
      <span
        className="relative inline-flex items-center gap-2 transition-colors duration-500"
        style={{ color: filling ? "#ffffff" : "#0d2f6b" }}
      >
        Contrate a FortGrow <ArrowRight size={17} />
      </span>
    </a>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
      {/* fundo esfumaçado azul (paleta da logo) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1000px 620px at 18% -5%, rgba(45,126,242,0.16), transparent 62%)," +
              "radial-gradient(800px 520px at 92% 12%, rgba(45,126,242,0.10), transparent 60%)," +
              "radial-gradient(700px 540px at 55% 105%, rgba(37,99,235,0.12), transparent 58%)",
          }}
        />
        {/* malha de linhas (rede) */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(45,126,242,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(45,126,242,0.055) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(900px 640px at 50% 20%, black, transparent 78%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 text-center lg:px-8">
        {/* Logo oficial "Estruturação Estratégica" com relevo 3D */}
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <Logo3D />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-8 max-w-4xl text-[1.9rem] font-extrabold uppercase leading-[1.16] tracking-tight text-white sm:text-4xl xl:text-[2.9rem]"
        >
          Não é sobre ter vídeos bonitos.
          <br />
          É sobre construir uma máquina{" "}
          <span className="inline-block -skew-x-3 bg-[#2d7ef2] px-2.5 py-0.5 text-white shadow-[0_0_34px_rgba(45,126,242,0.5)]">
            previsível de vendas
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          Unimos a estratégia de marketing, a estética do cinema e a precisão
          dos dados para escalar o seu negócio.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex justify-center"
        >
          <ContrateButton />
        </motion.div>

        {/* pilares rápidos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.56, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 flex flex-wrap items-center justify-center gap-2.5"
        >
          {[
            { icon: <BrainCircuit size={13} />, label: "Estratégia" },
            { icon: <Clapperboard size={13} />, label: "Estética de cinema" },
            { icon: <LineChart size={13} />, label: "Precisão de dados" },
            { icon: <Rocket size={13} />, label: "Escala" },
          ].map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-semibold text-slate-300"
            >
              <span className="text-[#7fb0f8]">{c.icon}</span> {c.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────── Prova social (100+ empresas) ─────────────────── */

/** Faixa do carrossel: logos duplicadas para o loop infinito ser contínuo. */
/* eslint-disable @next/next/no-img-element */
function MarqueeRow({ items, reverse = false }: { items: typeof CLIENTS; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="logo-marquee overflow-hidden">
      <div className={`logo-marquee-track flex items-center gap-16 pr-16 ${reverse ? "reverse" : ""}`}>
        {doubled.map((c, i) => (
          <img
            key={`${c.slug}-${i}`}
            src={`/site/clients/${c.slug}.png`}
            alt={c.name}
            title={c.name}
            loading="lazy"
            className="w-auto max-w-[200px] shrink-0 object-contain opacity-75 transition hover:opacity-100"
            style={{ height: "2.9rem" }}
          />
        ))}
      </div>
    </div>
  );
}

function Clients() {
  const half = Math.ceil(CLIENTS.length / 2);
  return (
    <section id="clientes" className="relative overflow-hidden border-y border-white/10 bg-black/30 py-16">
      {/* brilho azul suave atrás do carrossel (gradiente do slide) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(900px 420px at 50% 120%, rgba(45,126,242,0.10), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
            Mais de{" "}
            <span className="bg-[#2d7ef2] px-2 text-white">100 empresas</span>{" "}
            impactadas!
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Marcas que confiaram sua estruturação de marketing à FortGrow.
          </p>
        </Reveal>
      </div>

      {/* Carrossel infinito em duas faixas (sentidos opostos) */}
      <Reveal delay={0.1}>
        <div className="mt-12 space-y-10">
          <MarqueeRow items={CLIENTS.slice(0, half)} />
          <MarqueeRow items={CLIENTS.slice(half)} reverse />
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────── O problema ─────────────────── */

const PROBLEMS = [
  {
    icon: <ShieldCheck size={20} />,
    title: "Perda de Autoridade",
    text: "Um posicionamento visual fraco afasta clientes de alto valor.",
  },
  {
    icon: <Wallet size={20} />,
    title: "Desperdício de Capital",
    text: "Investir em anúncios sem uma estratégia de retenção clara. O tempo que você perde tentando fazer sozinho é o faturamento que você deixa de ganhar.",
  },
  {
    icon: <Radar size={20} />,
    title: "Distribuição sem Estratégia",
    text: "Não basta ter um vídeo de cinema se ele não for visto por quem tem poder de compra. Usamos inteligência de dados para colocar sua marca no radar de quem realmente converte.",
  },
];

function Problem() {
  return (
    <section id="problema" className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Kicker>O problema</Kicker>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Por que o seu investimento em marketing{" "}
            <span className="bg-gradient-to-r from-[#7fb0f8] to-[#b9d3fb] bg-clip-text text-transparent">
              não traz retorno?
            </span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-[#2d7ef2]/40">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2d7ef2]/10 text-[#7fb0f8]">
                  {p.icon}
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── A solução (hexágono + 3 pilares) ─────────────────── */

const SOLUTION_STEPS = [
  {
    icon: <BrainCircuit size={20} />,
    title: "Diagnóstico Estratégico",
    text: "Mapeamos seu público e o posicionamento único da sua marca.",
  },
  {
    icon: <Film size={20} />,
    title: "Produção Audiovisual",
    text: "Criamos o ativo (vídeo/foto) com foco total em retenção.",
  },
  {
    icon: <Crosshair size={20} />,
    title: "Distribuição Inteligente",
    text: "Levamos sua mensagem para quem realmente tem potencial de compra.",
  },
];

const ORBIT = [
  { icon: <Clapperboard size={14} />, label: "Audiovisual Estratégico" },
  { icon: <BrainCircuit size={14} />, label: "Diagnóstico Estratégico" },
  { icon: <Mic2 size={14} />, label: "Posicionamento & Narrativa" },
  { icon: <Rocket size={14} />, label: "Performance & ROI" },
  { icon: <TrendingUp size={14} />, label: "Otimização Contínua" },
];

function Solution() {
  return (
    <section id="metodo" className="relative overflow-hidden border-y border-white/10 bg-black/30 py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(700px 480px at 50% 45%, rgba(45,126,242,0.10), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker>A solução</Kicker>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Como a FortGrow{" "}
            <span className="bg-gradient-to-r from-[#7fb0f8] to-[#b9d3fb] bg-clip-text text-transparent">
              resolve esses problemas
            </span>
          </h2>
        </Reveal>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Hexágono neon + órbita de disciplinas */}
          <Reveal className="flex flex-col items-center">
            <NeonHex />
            <div className="mt-8 flex max-w-sm flex-wrap items-center justify-center gap-2">
              {ORBIT.map((o) => (
                <span
                  key={o.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2d7ef2]/25 bg-[#2d7ef2]/[0.07] px-3 py-1.5 text-[11px] font-semibold text-[#b9d3fb]"
                >
                  {o.icon} {o.label}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Os 3 passos */}
          <div className="space-y-4">
            {SOLUTION_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <div className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#2d7ef2]/40">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2d7ef2]/10 text-[#7fb0f8]">
                    {s.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── Engenharia de retenção ─────────────────── */

const RETENTION = [
  {
    icon: <Mic2 size={18} />,
    title: "Direção de Postura",
    text: "Orientamos sua fala e o cenário para transmitir autoridade.",
  },
  {
    icon: <Scissors size={18} />,
    title: "Edição Dinâmica",
    text: "Cortes estratégicos que impedem o usuário de “passar” o vídeo.",
  },
  {
    icon: <Zap size={18} />,
    title: "Roteiros com Gancho",
    text: "Capturamos a atenção nos primeiros 3 segundos.",
  },
];

function Retention() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker>Estética de cinema</Kicker>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Direção de imagem e{" "}
            <span className="bg-gradient-to-r from-[#7fb0f8] to-[#b9d3fb] bg-clip-text text-transparent">
              engenharia de retenção
            </span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {RETENTION.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-center transition hover:border-[#2d7ef2]/40">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#2d7ef2]/15 px-4 py-2 text-sm font-bold text-[#7fb0f8]">
                  {r.icon} {r.title}
                </span>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{r.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── O alvo certo ─────────────────── */

const TARGETS = [
  {
    icon: <Target size={18} />,
    title: "Segmentação Precisa",
    text: "Encontramos seu cliente ideal com base em dados reais.",
  },
  {
    icon: <Snowflake size={18} />,
    title: "Efeito Bola de Neve",
    text: "Reimpactamos interessados até que a venda aconteça.",
  },
  {
    icon: <BadgeCheck size={18} />,
    title: "Autoridade & Conversão",
    text: "Unimos vídeos de alto nível à estratégia de anúncios para aumentar sua taxa de fechamento.",
  },
  {
    icon: <Eye size={18} />,
    title: "Previsibilidade",
    text: "Você saberá exatamente quanto investir para crescer.",
  },
];

function Targeting() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-black/30 py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <Kicker>Tráfego com inteligência</Kicker>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            O alvo certo para o{" "}
            <span className="bg-gradient-to-r from-[#7fb0f8] to-[#b9d3fb] bg-clip-text text-transparent">
              seu investimento
            </span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
            Cada real de mídia é guiado por dados — da segmentação ao
            reimpacto — para que sua mensagem chegue a quem realmente converte.
          </p>
          {/* gráfico de setas de crescimento (referência do slide) */}
          <svg viewBox="0 0 300 120" className="mt-8 h-28 w-full max-w-sm" aria-hidden>
            <defs>
              <linearGradient id="tgArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d7ef2" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2d7ef2" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,105 C60,98 110,80 160,58 C210,36 250,22 292,10 L292,120 L0,120 Z" fill="url(#tgArea)" />
            <path
              d="M0,105 C60,98 110,80 160,58 C210,36 250,22 292,10"
              fill="none"
              stroke="#2d7ef2"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path d="M281,7 L295,9 L288,21 Z" fill="#2d7ef2" />
            <path
              d="M0,112 C70,108 130,96 180,80 C230,64 262,52 292,42"
              fill="none"
              stroke="rgba(147,187,250,0.4)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="5 6"
            />
          </svg>
        </Reveal>

        <div className="space-y-4">
          {TARGETS.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.08}>
              <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#2d7ef2]/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2d7ef2]/10 text-[#7fb0f8]">
                  {t.icon}
                </span>
                <div>
                  <h3 className="font-bold text-white">{t.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── Por que a FortGrow ─────────────────── */

const WHY = [
  {
    icon: <Clapperboard size={20} />,
    title: "Expertise Técnica e Criativa",
    text: "Unimos o padrão estético do cinema à inteligência de dados, garantindo que sua marca tenha autoridade imediata no mercado.",
  },
  {
    icon: <Gauge size={20} />,
    title: "Economia de Tempo e Recursos",
    text: "Cuidamos de todo o processo — do roteiro à gestão de tráfego — para você focar no seu negócio enquanto sua máquina de vendas roda no automático.",
  },
  {
    icon: <Users size={20} />,
    title: "Suporte e Consultoria Estratégica",
    text: "Não somos apenas executores: somos parceiros de crescimento que analisam métricas e otimizam resultados continuamente para garantir o seu ROI.",
  },
];

function Why() {
  return (
    <section id="diferenciais" className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Kicker>Diferenciais</Kicker>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Por que escolher a{" "}
            <span className="bg-[#2d7ef2] px-2 text-white">FortGrow?</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:border-[#2d7ef2]/40 hover:bg-white/[0.05]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2d7ef2]/20 to-[#5093f5]/10 text-[#7fb0f8]">
                  {w.icon}
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{w.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── Contato ─────────────────── */

const CONTACT_BENEFITS = [
  "Diagnóstico do seu momento atual",
  "Análise do potencial de crescimento",
  "Sem compromisso e sem custo",
];

function Contact() {
  const cta = ctaHref();
  return (
    <section id="contato" className="relative overflow-hidden border-t border-white/10 bg-black/30 py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 420px at 12% 0%, rgba(45,126,242,0.12), transparent 60%)," +
            "radial-gradient(600px 420px at 92% 100%, rgba(45,126,242,0.10), transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2d7ef2]/30 bg-[#2d7ef2]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#7fb0f8]">
            <TrendingUp size={13} /> Vamos escalar juntos
          </span>
          <h2 className="mt-6 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Pronto para construir sua{" "}
            <span className="bg-gradient-to-r from-[#7fb0f8] to-[#b9d3fb] bg-clip-text text-transparent">
              máquina previsível de vendas?
            </span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
            Preencha o formulário e um estrategista da FortGrow entra em
            contato para mapear seu momento e desenhar o plano de crescimento
            do seu negócio.
          </p>
          <ul className="mt-7 space-y-3">
            {CONTACT_BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="shrink-0 text-[#7fb0f8]" /> {b}
              </li>
            ))}
          </ul>
          {cta.startsWith("http") && (
            <a
              href={cta}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#2d7ef2]/50 hover:text-white"
            >
              <MessageCircle size={16} className="text-[#7fb0f8]" /> Prefiro chamar no WhatsApp
            </a>
          )}
        </Reveal>

        <Reveal delay={0.12}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────── Página ─────────────────── */

export function Landing() {
  return (
    <div className="min-h-screen bg-[#05090f] text-slate-200">
      <SiteNav slogan={SLOGAN} />
      <main>
        <Hero />
        <Clients />
        <Problem />
        <Solution />
        <Retention />
        <Targeting />
        <Why />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}
