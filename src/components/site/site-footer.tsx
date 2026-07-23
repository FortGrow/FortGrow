"use client";

import Link from "next/link";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import { NAV_LINKS, SITE, instagramUrl, whatsappUrl } from "@/lib/site-config";

export function SiteFooter() {
  const ig = instagramUrl();
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <FgMark size={34} />
            <span className="text-lg">
              <FgWordmark />
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Estruturação de marketing e performance para empresas que querem
            transformar investimento em previsibilidade de vendas.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Navegação
          </p>
          <ul className="mt-4 space-y-2.5">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-sm text-slate-400 transition hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className="text-sm text-slate-400 transition hover:text-white">
                Área do cliente
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Contato
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 text-sm text-slate-400 transition hover:text-white"
              >
                <MessageCircle size={16} className="text-grow-400" /> WhatsApp
              </a>
            </li>
            {SITE.email && (
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="inline-flex items-center gap-2.5 text-sm text-slate-400 transition hover:text-white"
                >
                  <Mail size={16} className="text-brand-300" /> {SITE.email}
                </a>
              </li>
            )}
            {ig && (
              <li>
                <a
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm text-slate-400 transition hover:text-white"
                >
                  <Instagram size={16} className="text-violet" /> Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-slate-600 sm:flex-row lg:px-8">
          <p>© {year} FortGrow · Estruturação de Marketing e Performance</p>
          <p>Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
