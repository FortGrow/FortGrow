"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  Globe,
  KanbanSquare,
  Megaphone,
  MessageCircle,
  PlugZap,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";
import { Reveal, CountUp } from "./motion";
import { SITE, diagnosisHref } from "@/lib/site-config";

// O canvas 3D só existe no cliente — sem SSR; enquanto carrega, o fundo
// gradiente segura a cena sem "pulo" visual.
const HeroOrb = dynamic(() => import("./hero-orb"), { ssr: false });

const SOLUTIONS = [
  { icon: Bot, title: "Agentes de IA", text: "Assistentes inteligentes que atendem, qualificam e vendem em qualquer canal." },
  { icon: KanbanSquare, title: "CRM Inteligente", text: "Pipeline, clientes e resultados em um só lugar, com automação de ponta a ponta." },
  { icon: Zap, title: "Automação Comercial", text: "Follow-ups, propostas e cobranças rodando sozinhos, sem depender de planilha." },
  { icon: MessageCircle, title: "Automação WhatsApp", text: "Atendimento e vendas 24/7 no canal que o seu cliente já usa todos os dias." },
  { icon: Globe, title: "Sites", text: "Sites e landing pages de alta conversão, rápidos e prontos para escalar." },
  { icon: Smartphone, title: "Aplicativos", text: "Apps sob medida para levar a sua operação para o bolso do cliente." },
  { icon: BarChart3, title: "Dashboards", text: "Business Intelligence com os números que importam, em tempo real." },
  { icon: PlugZap, title: "Integrações", text: "Seus sistemas conversando entre si — sem retrabalho e sem dado perdido." },
  { icon: Megaphone, title: "Marketing Digital", text: "Tráfego, conteúdo e performance guiados por dados, não por achismo." },
];

const TECHS = [
  "OpenAI", "Claude", "n8n", "Supabase", "Firebase", "React", "Next.js", "Flutter",
  "Node.js", "PostgreSQL", "Docker", "AWS", "Google Cloud", "Meta", "WhatsApp",
];

const CASES = [
  {
    category: "Clínicas & Saúde",
    title: "Atendimento que nunca dorme",
    result: "Agendamento e triagem automáticos no WhatsApp, com IA respondendo em segundos.",
    gradient: "from-[#3B82F6]/40 via-[#22D3EE]/20 to-transparent",
  },
  {
    category: "Comercial B2B",
    title: "Pipeline sob controle",
    result: "CRM + automação comercial: nenhuma oportunidade esquecida, follow-up no tempo certo.",
    gradient: "from-[#8B5CF6]/40 via-[#3B82F6]/20 to-transparent",
  },
  {
    category: "Varejo & Serviços",
    title: "Marketing guiado por dados",
    result: "Campanhas, dashboards e decisões conectados — investimento indo para onde dá retorno.",
    gradient: "from-[#22D3EE]/40 via-[#8B5CF6]/20 to-transparent",
  },
];

/** Home institucional da FortGrow — experiência cinematográfica em página única. */
export function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0B1220] text-[#F8FAFC]">
      {/* Fundo: gradientes suaves + objeto 3D fixo que se transforma com o scroll */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(900px 600px at 80% 10%, rgba(59,130,246,0.14), transparent 60%), radial-gradient(700px 500px at 10% 80%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(800px 500px at 50% 120%, rgba(139,92,246,0.08), transparent 60%)",
        }}
      />
      <HeroOrb />
      <SiteNav />

      <main className="relative z-10">
        {/* HERO — tela inteira, objeto à direita, texto à esquerda */}
        <section className="relative flex min-h-screen items-center px-5 pt-24 sm:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-2xl">
              <Reveal>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-[#22D3EE] backdrop-blur">
                  <Sparkles size={13} /> INTELIGÊNCIA ARTIFICIAL · AUTOMAÇÃO · CRESCIMENTO
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  FORT<span className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] bg-clip-text text-transparent">GROW</span>
                </h1>
                <p className="mt-4 text-2xl font-bold leading-snug text-[#F8FAFC] sm:text-3xl">
                  Transformando empresas através da Inteligência Artificial.
                </p>
              </Reveal>
              <Reveal delay={0.22}>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#CBD5E1] sm:text-lg">
                  Criamos soluções inteligentes para automatizar processos, acelerar vendas e impulsionar o crescimento
                  do seu negócio.
                </p>
              </Reveal>
              <Reveal delay={0.34}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={diagnosisHref()}
                    className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] px-6 py-3.5 text-sm font-bold text-[#0B1220] shadow-[0_8px_40px_-8px_rgba(34,211,238,0.7)] transition hover:shadow-[0_10px_48px_-8px_rgba(34,211,238,0.95)]"
                  >
                    Solicitar Diagnóstico
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/#solucoes"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-[#F8FAFC] backdrop-blur transition hover:border-white/30 hover:bg-white/10"
                  >
                    Conhecer Soluções
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.6} y={0} className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2">
              <ChevronDown size={22} className="animate-bounce text-[#CBD5E1]/60" />
            </Reveal>
          </div>
        </section>

        {/* SOBRE — o objeto migra pra esquerda; texto grande à direita */}
        <section id="sobre" className="scroll-mt-24 px-5 py-28 sm:px-8">
          <div className="mx-auto flex max-w-7xl justify-end">
            <div className="max-w-2xl">
              <Reveal>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#22D3EE]">Sobre a FortGrow</p>
                <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                  Tecnologia que{" "}
                  <span className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] bg-clip-text text-transparent">
                    acelera empresas.
                  </span>
                </h2>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-5 text-base leading-relaxed text-[#CBD5E1] sm:text-lg">
                  A FortGrow não é uma empresa de software — é um motor de crescimento. Unimos Inteligência Artificial,
                  automação, sistemas sob medida e marketing de performance para transformar a operação e os resultados
                  de quem confia na gente.
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {["IA", "Automação", "Sistemas", "Marketing", "Performance"].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#F8FAFC] backdrop-blur transition hover:border-[#22D3EE]/50 hover:text-[#22D3EE]"
                    >
                      ✔ {t}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SOLUÇÕES — cards glass com hover */}
        <section id="solucoes" className="scroll-mt-24 px-5 py-28 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#22D3EE]">Soluções</p>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Tudo que a sua empresa precisa para crescer</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOLUTIONS.map((s, i) => (
                <Reveal key={s.title} delay={(i % 3) * 0.08}>
                  <div className="group h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:border-[#3B82F6]/40 hover:bg-white/[0.07] hover:shadow-[0_20px_60px_-20px_rgba(59,130,246,0.4)]">
                    <span className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-[#3B82F6]/20 to-[#22D3EE]/20 p-3 text-[#22D3EE] transition-transform duration-500 group-hover:scale-110">
                      <s.icon size={22} strokeWidth={1.6} />
                    </span>
                    <h3 className="text-lg font-bold text-[#F8FAFC]">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#CBD5E1]">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* DIFERENCIAIS — números que contam sozinhos */}
        <section className="px-5 py-28 sm:px-8">
          <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-white/10 bg-white/[0.03] px-6 py-14 backdrop-blur sm:px-12">
            <div className="grid grid-cols-2 gap-10 text-center lg:grid-cols-4">
              {[
                { value: <CountUp to={500} prefix="+" />, label: "Processos Automatizados" },
                { value: <CountUp to={120} prefix="+" />, label: "Projetos" },
                { value: <CountUp to={98} suffix="%" />, label: "Clientes Satisfeitos" },
                { value: "24/7", label: "IA trabalhando" },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * 0.1}>
                  <p className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#CBD5E1]">{s.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TECNOLOGIAS */}
        <section className="px-5 py-28 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#22D3EE]">Stack</p>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Tecnologias que movem a FortGrow</h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {TECHS.map((t, i) => (
                <Reveal key={t} delay={(i % 5) * 0.05}>
                  <div className="flex h-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold tracking-wide text-[#CBD5E1] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#22D3EE]/40 hover:text-[#F8FAFC] hover:shadow-[0_12px_40px_-12px_rgba(34,211,238,0.45)]">
                    {t}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CASES */}
        <section id="cases" className="scroll-mt-24 px-5 py-28 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#22D3EE]">Cases</p>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Na prática, em qualquer segmento</h2>
            </Reveal>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {CASES.map((c, i) => (
                <Reveal key={c.title} delay={i * 0.1}>
                  <div className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_70px_-24px_rgba(59,130,246,0.45)]">
                    <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${c.gradient}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(248,250,252,0.12),transparent_50%)] transition-transform duration-700 group-hover:scale-125" />
                      <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-[#0B1220]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F8FAFC] backdrop-blur">
                        {c.category}
                      </span>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-[#F8FAFC]">{c.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#CBD5E1]">{c.result}</p>
                      <Link
                        href={diagnosisHref()}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#22D3EE] transition group-hover:gap-2.5"
                      >
                        Quero isso na minha empresa <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section id="contato" className="scroll-mt-24 px-5 py-32 sm:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Vamos construir a{" "}
                <span className="bg-gradient-to-r from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6] bg-clip-text text-transparent">
                  próxima evolução
                </span>{" "}
                da sua empresa?
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={diagnosisHref()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] px-8 py-4 text-base font-bold text-[#0B1220] shadow-[0_8px_48px_-8px_rgba(34,211,238,0.75)] transition hover:shadow-[0_12px_56px_-8px_rgba(34,211,238,1)]"
                >
                  Agendar Diagnóstico <ArrowRight size={18} />
                </Link>
                {SITE.whatsappUrl && (
                  <a
                    href={SITE.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-[#F8FAFC] backdrop-blur transition hover:border-white/30 hover:bg-white/10"
                  >
                    <MessageCircle size={18} /> Falar no WhatsApp
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
