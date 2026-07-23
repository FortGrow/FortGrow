import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";
import { diagnosisHref } from "@/lib/site-config";

/**
 * Casca das páginas internas do site institucional (IA para Empresas,
 * Desenvolvimento, Marketing, Blog, Contato…) — mesmo visual da Home,
 * pronta pra receber o conteúdo definitivo de cada área.
 */
export function SitePage({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0B1220] text-[#F8FAFC]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(900px 600px at 80% 0%, rgba(59,130,246,0.14), transparent 60%), radial-gradient(700px 500px at 10% 90%, rgba(34,211,238,0.10), transparent 60%)",
        }}
      />
      <SiteNav />
      <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-4xl flex-col items-start justify-center px-5 pb-24 pt-40 sm:px-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#22D3EE]">{eyebrow}</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          {title}{" "}
          {highlight && (
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] bg-clip-text text-transparent">{highlight}</span>
          )}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#CBD5E1] sm:text-lg">{description}</p>
        {children}
        <Link
          href={diagnosisHref()}
          className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] px-7 py-3.5 text-sm font-bold text-[#0B1220] shadow-[0_8px_40px_-8px_rgba(34,211,238,0.7)] transition hover:shadow-[0_10px_48px_-8px_rgba(34,211,238,0.95)]"
        >
          Agendar Diagnóstico <ArrowRight size={16} />
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
