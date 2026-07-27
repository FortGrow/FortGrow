"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, LogIn, Menu, X } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import { NAV_LINKS, ctaHref } from "@/lib/site-config";

/**
 * Barra de carregamento sob o item do menu.
 *
 * Mesma ideia do gatilho "Contrate a FortGrow": basta o cursor chegar —
 * não precisa clicar — e a barra preenche da esquerda para a direita em
 * 900ms, no mesmo tempo e na mesma curva do botão.
 *
 * Cresce por `scaleX` em vez de `width`: `width` é propriedade de layout
 * e obrigaria o navegador a recalcular a cada quadro; `transform` roda no
 * compositor. Também responde ao foco por teclado, para quem navega sem
 * mouse ver o mesmo retorno.
 */
function LoadBar() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-2.5 bottom-1 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-[#a9cdfb] to-white transition-transform duration-[900ms] ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
    />
  );
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // trava o scroll do body quando o menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const cta = ctaHref();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/15 bg-gradient-to-r from-[#1b5fd0]/95 via-[#2d7ef2]/95 to-[#1b5fd0]/95 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "border-b border-white/10 bg-gradient-to-r from-[#1b5fd0] via-[#2d7ef2] to-[#1b5fd0]"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="FortGrow">
            {/* monograma em branco: o azul original sumiria sobre a barra azul */}
            <FgMark size={34} className="brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" />
            <span className="text-lg">
              <FgWordmark light />
            </span>
          </Link>
        </div>

        {/* Menu desktop — a partir de xl: com sete itens + CTA a barra
            só respira a partir de 1280px; abaixo disso o hambúrguer assume */}
        <div className="hidden items-center gap-0.5 xl:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative whitespace-nowrap rounded-lg px-2 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-white/85 transition hover:bg-white/15 hover:text-white"
            >
              {l.label}
              <LoadBar />
            </a>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {/* Fundo próprio: o cliente que vem para logar precisa achar isto
              de primeira. Contorno translúcido em vez de sólido — o branco
              cheio é do "Falar com especialista", que é a ação principal. */}
          <Link
            href="/login"
            className="group relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/40 bg-white/15 px-3 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:border-white/60 hover:bg-white/25"
          >
            <LogIn size={14} />
            Entrar
          </Link>
          <a href={cta} target={cta.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-bold text-[#1b5fd0] shadow-[0_4px_18px_-6px_rgba(0,0,0,0.45)] transition hover:bg-[#eaf2ff] active:scale-[0.97]">
            Falar com especialista <ArrowUpRight size={15} />
          </a>
        </div>

        {/* Botão mobile */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 text-white xl:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-white/20 bg-gradient-to-b from-[#1b5fd0] to-[#124099] xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white/90 transition hover:bg-white/15"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-bold uppercase tracking-[0.06em] text-white transition hover:bg-white/25"
              >
                <LogIn size={15} />
                Entrar
              </Link>
              <a
                href={cta}
                target={cta.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#1b5fd0] transition hover:bg-[#eaf2ff] active:scale-[0.97]"
              >
                Falar agora
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
