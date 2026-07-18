"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Instagram,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  MousePointerClick,
  Search,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";

/* ────────────────────────────────────────────────────────────────────────────
 * Muro de cards (referência Netflix): mosaico de mini-cards de marketing
 * cobrindo todo o fundo, com overlay escuro e leve inclinação.
 * ──────────────────────────────────────────────────────────────────────── */

type Tile =
  | { kind: "kpi"; title: string; value: string; delta: string; hue: string }
  | { kind: "channel"; label: string; icon: "meta" | "google" | "ig" | "seo" | "leads" | "clicks" | "team" | "chart"; hue: string }
  | { kind: "sale"; value: string; hue: string }
  | { kind: "bars"; hue: string }
  | { kind: "spark"; hue: string };

const HUES = {
  blue: "2,132,199",
  sky: "56,189,248",
  green: "5,150,105",
  emerald: "52,211,153",
  violet: "139,92,246",
  purple: "167,139,250",
  orange: "217,119,6",
  pink: "236,72,153",
};

const TILES: Tile[] = [
  { kind: "kpi", title: "ROAS", value: "5.2x", delta: "+18%", hue: HUES.emerald },
  { kind: "channel", label: "Meta Ads", icon: "meta", hue: HUES.blue },
  { kind: "sale", value: "R$ 4.750", hue: HUES.green },
  { kind: "bars", hue: HUES.violet },
  { kind: "kpi", title: "Leads", value: "1.284", delta: "+32%", hue: HUES.sky },
  { kind: "channel", label: "Google Ads", icon: "google", hue: HUES.orange },
  { kind: "spark", hue: HUES.emerald },
  { kind: "channel", label: "Posicionamento", icon: "seo", hue: HUES.purple },
  { kind: "kpi", title: "CPL", value: "R$ 8,40", delta: "-21%", hue: HUES.violet },
  { kind: "sale", value: "R$ 12.400", hue: HUES.emerald },
  { kind: "channel", label: "Instagram", icon: "ig", hue: HUES.pink },
  { kind: "bars", hue: HUES.sky },
  { kind: "kpi", title: "Receita", value: "R$ 2,4M", delta: "+47%", hue: HUES.purple },
  { kind: "channel", label: "Geração de leads", icon: "leads", hue: HUES.green },
  { kind: "spark", hue: HUES.blue },
  { kind: "kpi", title: "CTR", value: "3,8%", delta: "+12%", hue: HUES.orange },
  { kind: "sale", value: "R$ 1.290", hue: HUES.green },
  { kind: "channel", label: "CRM & Vendas", icon: "team", hue: HUES.sky },
  { kind: "bars", hue: HUES.emerald },
  { kind: "kpi", title: "Conversão", value: "6,3%", delta: "+9%", hue: HUES.pink },
  { kind: "channel", label: "Tráfego pago", icon: "clicks", hue: HUES.violet },
  { kind: "spark", hue: HUES.purple },
  { kind: "kpi", title: "Vendas", value: "312", delta: "+28%", hue: HUES.emerald },
  { kind: "channel", label: "Performance", icon: "chart", hue: HUES.blue },
];

const CHANNEL_ICONS = {
  meta: Megaphone,
  google: Target,
  ig: Instagram,
  seo: Search,
  leads: Users,
  clicks: MousePointerClick,
  team: ShoppingCart,
  chart: BarChart3,
};

function TileCard({ tile }: { tile: Tile }) {
  const bg = `linear-gradient(160deg, rgba(${tile.hue},0.30), rgba(${tile.hue},0.08) 70%)`;
  if (tile.kind === "kpi") {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 p-3" style={{ background: bg }}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">{tile.title}</p>
        <div>
          <p className="text-base font-extrabold text-white/90">{tile.value}</p>
          <p className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: `rgb(${tile.hue})` }}>
            <ArrowUpRight size={10} /> {tile.delta}
          </p>
        </div>
      </div>
    );
  }
  if (tile.kind === "channel") {
    const Icon = CHANNEL_ICONS[tile.icon];
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 p-3 text-center" style={{ background: bg }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/85">
          <Icon size={15} />
        </span>
        <p className="text-[10px] font-bold leading-tight text-white/75">{tile.label}</p>
      </div>
    );
  }
  if (tile.kind === "sale") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-white/10 p-3" style={{ background: bg }}>
        <span className="text-lg">💰</span>
        <p className="text-[10px] font-bold text-white/85">Venda realizada</p>
        <p className="text-xs font-extrabold" style={{ color: `rgb(${tile.hue})` }}>{tile.value}</p>
      </div>
    );
  }
  if (tile.kind === "bars") {
    return (
      <div className="flex h-full items-end justify-center gap-1.5 rounded-xl border border-white/10 p-3.5" style={{ background: bg }}>
        {[35, 55, 45, 70, 60, 90].map((h, i) => (
          <span key={i} className="w-2 rounded-sm" style={{ height: `${h}%`, background: `rgba(${tile.hue},0.75)` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-full items-center rounded-xl border border-white/10 p-3" style={{ background: bg }}>
      <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
        <path
          d="M0,34 C15,32 25,26 40,22 C58,17 74,10 100,4"
          fill="none"
          stroke={`rgb(${tile.hue})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
      </svg>
    </div>
  );
}

/** Fundo: muro inclinado de cards + overlay escuro + parallax leve. */
function Wall() {
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
          ref.current?.style.setProperty("--wx", `${(-mx * 16).toFixed(1)}px`);
          ref.current?.style.setProperty("--wy", `${(-my * 10).toFixed(1)}px`);
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // repete os tiles para cobrir qualquer resolução
  const wall = [...TILES, ...TILES, ...TILES];

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-[-12%] grid auto-rows-[104px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 opacity-70 blur-[1.5px]"
        style={{
          transform: "rotate(-4deg) scale(1.12) translate3d(var(--wx, 0px), var(--wy, 0px), 0)",
          transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {wall.map((tile, i) => (
          <TileCard key={i} tile={tile} />
        ))}
      </div>
      {/* Overlay escuro (leitura) + vinheta */}
      <div className="absolute inset-0 bg-ink-950/60" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 640px at 50% 42%, rgba(8,11,18,0.25), rgba(8,11,18,0.9) 78%)," +
            "linear-gradient(to bottom, rgba(8,11,18,0.85), transparent 22%, transparent 72%, rgba(8,11,18,0.95))",
        }}
      />
    </div>
  );
}

/** Notificação de venda ao vivo (canto da tela). */
const SALES = [
  { icon: "💰", title: "Venda realizada", detail: "R$ 4.750 · Plano Performance", time: "agora mesmo" },
  { icon: "🛒", title: "Novo pedido no e-commerce", detail: "R$ 1.290 · via tráfego pago", time: "há 2 min" },
  { icon: "📞", title: "Lead qualificado agendou reunião", detail: "origem: Meta Ads", time: "há 5 min" },
  { icon: "💰", title: "Venda realizada", detail: "R$ 12.400 · contrato anual", time: "há 9 min" },
];

function SalesToasts() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SALES.length), 3400);
    return () => clearInterval(t);
  }, []);
  const sale = SALES[idx];
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-20 hidden w-72 lg:block">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-2xl border border-grow-500/25 bg-ink-900/85 p-3.5 shadow-2xl ring-1 ring-grow-500/10 backdrop-blur-md"
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
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(56,189,248,0.06)] backdrop-blur-xl"
    >
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
            className="input border-white/10 bg-ink-950/50 pl-10 focus:shadow-[0_0_24px_-6px_rgba(56,189,248,0.5)]"
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
            className="input border-white/10 bg-ink-950/50 pl-10 focus:shadow-[0_0_24px_-6px_rgba(56,189,248,0.5)]"
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

      <p className="pt-1 text-center text-[11px] text-slate-500">
        Área administrativa e Portal do Cliente · Acesso protegido
      </p>
    </motion.form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <Wall />
      <SalesToasts />

      {/* Conteúdo central (referência Netflix) */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 flex items-center gap-3"
        >
          <FgMark size={52} className="drop-shadow-[0_0_20px_rgba(56,189,248,0.45)]" />
          <p className="text-lg font-bold tracking-tight">
            <FgWordmark /> <span className="font-semibold text-slate-400">CRM</span>
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-[2.9rem]"
        >
          Estruturamos o{" "}
          <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-grow-400 bg-clip-text text-transparent">
            marketing
          </span>{" "}
          que faz sua empresa vender.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-300"
        >
          Posicionamento, tráfego pago, geração de leads e vendas — a FortGrow
          constrói sua máquina de crescimento de ponta a ponta.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 mt-5 flex flex-wrap justify-center gap-2"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-slate-300 backdrop-blur-sm"
            >
              <span className="text-brand-300">{c.icon}</span> {c.label}
            </span>
          ))}
        </motion.div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
