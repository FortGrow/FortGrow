"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Compass,
  Gauge,
  LayoutGrid,
  LineChart,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";
import { Reveal, CountUp } from "./motion";
import { ContactForm } from "./contact-form";
import { STATS, PLATFORMS, INCLUDED, SLOGAN, ctaHref } from "@/lib/site-config";

/* ───────────────────────── Hero ───────────────────────── */

const HERO_CHIPS = [
  { icon: <Search size={13} />, label: "Posicionamento" },
  { icon: <Megaphone size={13} />, label: "Tráfego pago" },
  { icon: <Target size={13} />, label: "Geração de leads" },
  { icon: <LineChart size={13} />, label: "Performance por dados" },
];

function HeroDashCard({
  className,
  title,
  value,
  delta,
  color,
  path,
  delay,
}: {
  className: string;
  title: string;
  value: string;
  delta: string;
  color: string;
  path: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute w-44 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 shadow-2xl backdrop-blur-md ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-lg font-bold text-white">{value}</p>
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold" style={{ color }}>
          <ArrowUpRight size={12} /> {delta}
        </span>
      </div>
      <svg viewBox="0 0 100 28" className="mt-2 h-7 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`hg-${title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L100,28 L0,28 Z`} fill={`url(#hg-${title})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

function Hero() {
  const cta = ctaHref();
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 600px at 15% 0%, rgba(2,132,199,0.18), transparent 60%)," +
              "radial-gradient(700px 500px at 90% 20%, rgba(5,150,105,0.12), transparent 60%)," +
              "radial-gradient(600px 500px at 60% 90%, rgba(139,92,246,0.10), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            maskImage: "radial-gradient(900px 600px at 30% 20%, black, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-300"
          >
            <Sparkles size={13} /> FortGrow é performance
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl xl:text-6xl"
          >
            Marketing que vira{" "}
            <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-grow-400 bg-clip-text text-transparent">
              venda
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            A FortGrow estrutura o marketing da sua empresa de ponta a ponta —
            do posicionamento da marca ao tráfego pago que gera receita.
            Estratégia, execução e dados para transformar investimento em
            resultado previsível.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a href="#contato" className="btn-primary text-base">
              Quero crescer com a FortGrow <ArrowRight size={16} />
            </a>
            <a href="#solucoes" className="btn-ghost text-base">
              Ver soluções
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap gap-2"
          >
            {HERO_CHIPS.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold text-slate-300 backdrop-blur-sm"
              >
                <span className="text-brand-300">{c.icon}</span> {c.label}
              </span>
            ))}
          </motion.div>
        </div>

        <div className="relative hidden h-[440px] lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-ink-900/70 p-5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Performance · 30 dias
                </p>
                <p className="mt-1 text-2xl font-extrabold text-white">R$ 486.200</p>
                <p className="text-xs text-slate-500">receita atribuída ao marketing</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-grow-500/15 px-2 py-1 text-xs font-bold text-grow-400">
                <TrendingUp size={12} /> +47%
              </span>
            </div>

            <svg viewBox="0 0 300 110" className="mt-4 h-28 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,95 C40,88 60,72 100,60 C150,45 190,38 300,10 L300,110 L0,110 Z"
                fill="url(#heroArea)"
              />
              <path
                d="M0,95 C40,88 60,72 100,60 C150,45 190,38 300,10"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { k: "Leads", v: "1.284", c: "text-brand-300" },
                { k: "CPL", v: "R$ 8,40", c: "text-grow-400" },
                { k: "ROAS", v: "5.2x", c: "text-violet" },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.k}</p>
                  <p className={`mt-0.5 text-sm font-bold ${m.c}`}>{m.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <HeroDashCard
            className="right-0 top-2"
            title="Leads gerados"
            value="1.284"
            delta="32%"
            color="#38bdf8"
            path="M0,24 C15,22 25,18 38,16 C55,13 70,9 100,3"
            delay={0.7}
          />
          <HeroDashCard
            className="bottom-0 left-0"
            title="ROAS · Tráfego"
            value="5.2x"
            delta="18%"
            color="#34d399"
            path="M0,25 C18,24 30,20 45,17 C62,13 80,10 100,5"
            delay={0.9}
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 3 Passos ─────────────────────── */

const STEPS = [
  {
    n: "01",
    icon: <LayoutGrid size={20} />,
    title: "Conheça as soluções",
    tag: "O que fazemos",
    text: "Do posicionamento ao tráfego pago: montamos a estrutura de marketing certa para o momento da sua empresa.",
  },
  {
    n: "02",
    icon: <Compass size={20} />,
    title: "Escolha como vamos executar",
    tag: "Como fazemos",
    text: "Definimos juntos o modelo de entrega e as metas. Você acompanha cada etapa com transparência total.",
  },
  {
    n: "03",
    icon: <Rocket size={20} />,
    title: "Comece a crescer",
    tag: "O próximo passo",
    text: "Colocamos a máquina para rodar e otimizamos por dados, mês após mês, com foco em vendas.",
  },
];

function Steps() {
  return (
    <section className="relative border-y border-white/10 bg-ink-950/60 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Simples assim</p>
          <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Transforme o marketing da sua empresa em{" "}
            <span className="bg-gradient-to-r from-brand-400 to-grow-400 bg-clip-text text-transparent">
              3 passos
            </span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-brand-500/40">
                <span className="absolute -right-3 -top-4 text-7xl font-extrabold text-white/[0.04] transition group-hover:text-brand-500/10">
                  {s.n}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                  {s.icon}
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-grow-400">{s.tag}</p>
                <h3 className="mt-1 text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10 text-center">
          <a href="#contato" className="btn-primary text-base">
            Dar o próximo passo <ArrowRight size={16} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── Soluções ─────────────────────── */

const SOLUTIONS = [
  {
    icon: <Megaphone size={20} />,
    title: "Gestão de tráfego pago",
    text: "Campanhas de Meta e Google Ads geridas com foco em CPL, ROAS e vendas — não em curtidas.",
  },
  {
    icon: <Compass size={20} />,
    title: "Estruturação de marketing",
    text: "Posicionamento, funil e planejamento estratégico para a marca crescer com direção.",
  },
  {
    icon: <MousePointerClick size={20} />,
    title: "Criativos & conteúdo",
    text: "Peças e mensagens pensadas para converter, testadas e otimizadas continuamente.",
  },
  {
    icon: <Users size={20} />,
    title: "Geração de leads & CRM",
    text: "Leads qualificados organizados em um CRM que acompanha cada oportunidade até a venda.",
  },
  {
    icon: <Search size={20} />,
    title: "Posicionamento de marca",
    text: "Sua empresa reconhecida como referência — do Google às redes sociais.",
  },
  {
    icon: <LineChart size={20} />,
    title: "Performance & dados",
    text: "Relatórios claros e acompanhamento em tempo real do que o marketing gera em receita.",
  },
];

function Solutions() {
  return (
    <section id="solucoes" className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">O que fazemos</p>
          <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Soluções de marketing FortGrow
          </h2>
          <p className="mt-3 text-slate-400">
            Da estratégia à execução, cuidamos de cada engrenagem da sua máquina
            de vendas.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-brand-500/40 hover:bg-white/[0.05]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-grow-500/10 text-brand-300">
                  {s.icon}
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── O que está incluído ─────────────────────── */

function Included() {
  return (
    <section id="metodo" className="relative border-y border-white/10 bg-ink-950/60 py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Como fazemos</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Uma estrutura completa,{" "}
            <span className="bg-gradient-to-r from-brand-400 to-grow-400 bg-clip-text text-transparent">
              trabalhando por você
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Você não contrata um serviço solto — contrata a estrutura de
            marketing da sua empresa. Um time dedicado cuidando de cada frente,
            integrado no mesmo lugar, com metas claras e resultado medido.
          </p>
          <div className="mt-8">
            <a href="#contato" className="btn-primary">
              Montar minha estrutura <ArrowRight size={15} />
            </a>
          </div>
        </Reveal>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Incluído na sua estrutura
          </p>
          <ul className="mt-5 space-y-3.5">
            {INCLUDED.map((item, i) => (
              <Reveal key={item} delay={i * 0.06}>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grow-500/15 text-grow-400">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium text-slate-200">{item}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Resultados (stats) ─────────────────────── */

function Stats() {
  return (
    <section id="resultados" className="relative py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Resultados</p>
          <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Marketing que aparece no caixa
          </h2>
          <p className="mt-3 text-slate-400">
            Trabalhamos com metas claras e acompanhamento por dados. Cada real
            investido é medido — do clique até a venda.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="bg-gradient-to-r from-brand-300 to-grow-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                  <CountUp
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals ?? 0}
                  />
                </p>
                <p className="mt-3 text-sm text-slate-400">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Plataformas de mídia */}
        <Reveal delay={0.1} className="mt-16">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">
            Gestão nas principais plataformas de mídia
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300"
              >
                {p}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── Sobre ─────────────────────── */

const ABOUT_POINTS = [
  {
    icon: <Compass size={18} />,
    title: "Estratégia antes de anúncio",
    text: "Diagnóstico, posicionamento e plano de crescimento — a base que faz a mídia performar.",
  },
  {
    icon: <Gauge size={18} />,
    title: "Obsessão por performance",
    text: "Decisões guiadas por dados: CAC, CPL, ROAS e receita medidos em tempo real.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Parceria de verdade",
    text: "Um time dedicado ao seu negócio, com transparência total em cada resultado.",
  },
];

function About() {
  return (
    <section id="sobre" className="relative border-t border-white/10 py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            Sobre a FortGrow
          </p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Não somos uma agência de anúncios.{" "}
            <span className="bg-gradient-to-r from-brand-400 to-grow-400 bg-clip-text text-transparent">
              Somos a estrutura de marketing da sua empresa.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            A FortGrow existe para transformar marketing em máquina de
            crescimento. Unimos estratégia, execução e tecnologia para que sua
            empresa venda mais, com previsibilidade e controle de cada etapa —
            do primeiro contato do lead até o fechamento.
          </p>
          <div className="mt-8">
            <a href="#contato" className="btn-primary">
              Estruturar meu marketing <ArrowRight size={15} />
            </a>
          </div>
        </Reveal>

        <div className="space-y-4">
          {ABOUT_POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                  {p.icon}
                </span>
                <div>
                  <h3 className="font-bold text-white">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Contato (formulário) ─────────────────────── */

const CONTACT_BENEFITS = [
  "Diagnóstico do seu momento atual",
  "Análise do potencial de crescimento",
  "Sem compromisso e sem custo",
];

function Contact() {
  const cta = ctaHref();
  return (
    <section id="contato" className="relative overflow-hidden border-t border-white/10 py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 400px at 10% 0%, rgba(2,132,199,0.14), transparent 60%)," +
            "radial-gradient(600px 400px at 90% 100%, rgba(5,150,105,0.12), transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand-300">
            <TrendingUp size={13} /> Vamos crescer juntos
          </span>
          <h2 className="mt-6 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Dar o próximo passo leva{" "}
            <span className="bg-gradient-to-r from-brand-400 to-grow-400 bg-clip-text text-transparent">
              menos de um minuto
            </span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
            Preencha o formulário e um especialista da FortGrow entra em contato
            para entender seu negócio e mostrar como podemos crescer juntos.
          </p>
          <ul className="mt-7 space-y-3">
            {CONTACT_BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="shrink-0 text-grow-400" /> {b}
              </li>
            ))}
          </ul>
          {cta.startsWith("http") && (
            <a
              href={cta}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost mt-8 inline-flex"
            >
              <MessageCircle size={16} /> Prefiro chamar no WhatsApp
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

/* ─────────────────────── Página ─────────────────────── */

export function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <SiteNav slogan={SLOGAN} />
      <main>
        <Hero />
        <Steps />
        <Solutions />
        <Included />
        <Stats />
        <About />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}
