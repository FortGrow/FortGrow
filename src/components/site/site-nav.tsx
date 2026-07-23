"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import { diagnosisHref } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Soluções", href: "/#solucoes" },
  { label: "IA para Empresas", href: "/ia-para-empresas" },
  { label: "Desenvolvimento", href: "/desenvolvimento" },
  { label: "Marketing", href: "/marketing" },
  { label: "Cases", href: "/#cases" },
  { label: "Blog", href: "/blog" },
  { label: "Contato", href: "/contato" },
];

/**
 * Menu do site institucional — glassmorphism fixo que encolhe e ganha blur ao
 * rolar; links com glow e underline animado; gaveta no mobile.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled
          ? "border-b border-white/10 bg-[#0B1220]/70 py-2.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent py-5"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <FgMark size={scrolled ? 30 : 36} />
          <span className="text-sm"><FgWordmark /></span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium text-[#CBD5E1] transition duration-300 hover:text-[#F8FAFC] hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.55)]"
            >
              {l.label}
              <span className="absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-4">
          <Link
            href="/login"
            className="hidden rounded-xl border border-white/10 px-4 py-2 text-[13px] font-semibold text-[#CBD5E1] transition hover:border-white/25 hover:text-[#F8FAFC] sm:block"
          >
            Entrar
          </Link>
          <Link
            href={diagnosisHref()}
            className="rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] px-4 py-2 text-[13px] font-bold text-[#0B1220] shadow-[0_4px_24px_-6px_rgba(34,211,238,0.6)] transition hover:shadow-[0_6px_32px_-6px_rgba(34,211,238,0.85)]"
          >
            Agendar Diagnóstico
          </Link>
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="rounded-xl border border-white/10 p-2 text-[#CBD5E1] transition hover:text-[#F8FAFC] xl:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Gaveta mobile */}
      <div className={cn("fixed inset-0 z-50 xl:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
        <button
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-[#0B1220]/80 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        />
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-white/10 bg-[#111827] p-5 transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm"><FgWordmark /></span>
            <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg p-2 text-[#CBD5E1]">
              <X size={18} />
            </button>
          </div>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#CBD5E1] transition hover:bg-white/5 hover:text-[#F8FAFC]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-auto rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-[#CBD5E1]"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
