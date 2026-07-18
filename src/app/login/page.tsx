"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, Loader2, Lock, Mail, Megaphone, Search, ShoppingCart, Target, TrendingUp } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { FgMark, FgWordmark } from "@/components/brand/logo";

/** Mini dashboard flutuante decorativo (gráficos de crescimento em SVG puro). */
function FloatCard({
  className,
  title,
  value,
  delta,
  color,
  path,
  delay = 0,
}: {
  className: string;
  title: string;
  value: string;
  delta: string;
  color: string;
  path: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`pointer-events-none absolute w-44 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 shadow-2xl backdrop-blur-md ${className}`}
      style={{ transform: "translate3d(var(--plx, 0px), var(--ply, 0px), 0)" }}
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
          <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L100,28 L0,28 Z`} fill={`url(#g-${title})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

/** Notificações de venda simuladas, aparecendo em ciclo (prova de resultado). */
const SALES = [
  { icon: "💰", title: "Venda realizada", detail: "R$ 4.750 · Plano Performance", time: "agora mesmo" },
  { icon: "🛒", title: "Novo pedido no e-commerce", detail: "R$ 1.290 · via tráfego pago", time: "há 2 min" },
  { icon: "📞", title: "Lead qualificado agendou reunião", detail: "origem: Meta Ads", time: "há 5 min" },
  { icon: "💰", title: "Venda realizada", detail: "R$ 12.400 · contrato anual", time: "há 9 min" },
];

function SalesToasts({ className }: { className: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SALES.length), 3400);
    return () => clearInterval(t);
  }, []);
  const sale = SALES[idx];
  return (
    <div className={`pointer-events-none absolute w-64 ${className}`} style={{ transform: "translate3d(var(--plx, 0px), var(--ply, 0px), 0)" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-2xl border border-grow-500/25 bg-ink-900/80 p-3.5 shadow-2xl ring-1 ring-grow-500/10 backdrop-blur-md"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grow-500/15 text-lg">
            {sale.icon}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-xs font-bold text-white">
              {sale.title} <BadgeCheck size={12} className="shrink-0 text-grow-400" />
            </p>
            <p className="truncate text-[11px] text-slate-400">{sale.detail}</p>
            <p className="text-[10px] text-slate-600">{sale.time}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Cena de fundo: gradientes, grade, orbes e dashboards flutuantes com parallax. */
function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const mx = e.clientX / window.innerWidth - 0.5;
      const my = e.clientY / window.innerHeight - 0.5;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          const el = ref.current;
          if (!el) return;
          el.style.setProperty("--plx", `${(-mx * 18).toFixed(1)}px`);
          el.style.setProperty("--ply", `${(-my * 12).toFixed(1)}px`);
          el.style.setProperty("--plx2", `${(-mx * 8).toFixed(1)}px`);
          el.style.setProperty("--ply2", `${(-my * 5).toFixed(1)}px`);
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Gradientes de luz (azul tecnológico, verde crescimento, roxo leve) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 20% 10%, rgba(2,132,199,0.16), transparent 60%)," +
            "radial-gradient(700px 500px at 85% 85%, rgba(5,150,105,0.12), transparent 60%)," +
            "radial-gradient(600px 500px at 75% 15%, rgba(139,92,246,0.09), transparent 55%)",
        }}
      />
      {/* Grade de pontos (camada mais lenta) */}
      <div
        className="absolute inset-[-40px]"
        style={{
          backgroundImage: "radial-gradient(rgba(148,163,184,0.09) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(800px 600px at 35% 45%, black, transparent 75%)",
          transform: "translate3d(var(--plx2, 0px), var(--ply2, 0px), 0)",
          transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      {/* Linha de crescimento gigante ao fundo (levemente desfocada) */}
      <svg
        viewBox="0 0 800 400"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 h-[55%] w-full opacity-40 blur-[2px]"
        style={{ transform: "translate3d(var(--plx2, 0px), var(--ply2, 0px), 0)", transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}
      >
        <defs>
          <linearGradient id="rise" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,360 C140,340 220,300 340,250 C480,190 570,140 800,40 L800,400 L0,400 Z" fill="url(#rise)" />
        <path
          d="M0,360 C140,340 220,300 340,250 C480,190 570,140 800,40"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
      </svg>

      {/* Dashboards flutuantes (só em telas grandes) */}
      <div className="hidden lg:block">
        <FloatCard
          className="left-[7%] top-[16%]"
          title="Leads gerados"
          value="1.284"
          delta="32%"
          color="#38bdf8"
          path="M0,24 C15,22 25,18 38,16 C55,13 70,9 100,3"
          delay={0.5}
        />
        <FloatCard
          className="left-[30%] top-[7%]"
          title="Tráfego pago · ROAS"
          value="5.2x"
          delta="18%"
          color="#34d399"
          path="M0,25 C18,24 30,20 45,17 C62,13 80,10 100,5"
          delay={0.75}
        />
        {/* Posicionamento (SEO/Google) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute left-[34%] top-[21%] flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
          style={{ transform: "translate3d(var(--plx, 0px), var(--ply, 0px), 0)" }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <Search size={15} />
          </span>
          <div>
            <p className="text-xs font-bold text-white">Posicionamento</p>
            <p className="text-[10px] text-slate-400">Top 3 no Google · marca fortalecida</p>
          </div>
        </motion.div>
        {/* Notificações de venda em tempo real (simuladas) */}
        <SalesToasts className="left-[27%] top-[68%]" />
        <FloatCard
          className="left-[9%] top-[72%]"
          title="Receita gerada"
          value="R$ 2,4M"
          delta="47%"
          color="#a78bfa"
          path="M0,26 C14,25 28,22 40,18 C58,12 76,8 100,2"
          delay={1}
        />
      </div>

      {/* Overlay escuro para leitura */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-transparent to-ink-950/60" />
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace(params.get("next") ?? data.home);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <div className="mb-7 flex flex-col items-center text-center lg:hidden">
        <FgMark size={64} className="mb-3 drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]" />
        <h1 className="text-xl tracking-tight">
          <FgWordmark /> <span className="font-semibold text-slate-400">CRM</span>
        </h1>
      </div>

      {/* Card de vidro (flutuação fica só nos elementos decorativos —
          formulário estável para digitar/clicar) */}
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.055] p-7 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(56,189,248,0.06)] backdrop-blur-xl"
      >
        <div className="mb-2 hidden items-center gap-3 lg:flex">
          <FgMark size={40} className="drop-shadow-[0_0_14px_rgba(56,189,248,0.4)]" />
          <div>
            <p className="text-sm font-bold text-slate-100">
              <FgWordmark /> <span className="font-semibold text-slate-400">CRM</span>
            </p>
            <p className="text-[11px] text-slate-500">Acesse sua conta para continuar</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="input border-white/10 bg-white/[0.04] pl-10 focus:shadow-[0_0_24px_-6px_rgba(56,189,248,0.5)]"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input border-white/10 bg-white/[0.04] pl-10 focus:shadow-[0_0_24px_-6px_rgba(56,189,248,0.5)]"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger ring-1 ring-inset ring-danger/20">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Loader2 size={15} className="animate-spin" />}
          Entrar
        </button>

        <p className="pt-1 text-center text-[11px] text-slate-600">
          Área administrativa e Portal do Cliente · Acesso protegido
        </p>
      </form>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <Backdrop />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Lado visual: marca + frase de impacto */}
        <div className="hidden flex-col justify-center px-14 xl:px-20 lg:flex">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand-300">
              <TrendingUp size={13} /> Plataforma de crescimento FortGrow
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-[2.6rem] font-extrabold leading-[1.12] tracking-tight text-white xl:text-5xl"
          >
            Estruturamos o{" "}
            <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-grow-400 bg-clip-text text-transparent">
              marketing
            </span>{" "}
            que faz sua empresa vender.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-md text-base leading-relaxed text-slate-400"
          >
            A FortGrow constrói sua máquina de crescimento de ponta a ponta —
            do posicionamento da marca ao tráfego pago que vira venda.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex flex-wrap gap-2"
          >
            {[
              { icon: <Search size={12} />, label: "Posicionamento" },
              { icon: <Megaphone size={12} />, label: "Tráfego pago" },
              { icon: <Target size={12} />, label: "Geração de leads" },
              { icon: <ShoppingCart size={12} />, label: "Vendas" },
              { icon: <TrendingUp size={12} />, label: "Dados & performance" },
            ].map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-slate-300 backdrop-blur-sm"
              >
                <span className="text-brand-300">{c.icon}</span> {c.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Lado do formulário */}
        <div className="flex items-center justify-center px-4 py-10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
