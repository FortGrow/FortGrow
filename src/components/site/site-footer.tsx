import Link from "next/link";
import { FgMark, FgWordmark } from "@/components/brand/logo";
import { SITE } from "@/lib/site-config";

/** Rodapé minimalista do site institucional. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#0B1220]/80 px-5 py-14 backdrop-blur sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FgMark size={32} />
            <span className="text-sm"><FgWordmark /></span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#CBD5E1]">
            Crescimento empresarial através de Inteligência Artificial, automação e tecnologia premium.
          </p>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#CBD5E1]/70">Navegação</p>
          <ul className="space-y-2 text-sm text-[#CBD5E1]">
            <li><Link href="/#sobre" className="transition hover:text-[#F8FAFC]">Sobre</Link></li>
            <li><Link href="/#solucoes" className="transition hover:text-[#F8FAFC]">Soluções</Link></li>
            <li><Link href="/#cases" className="transition hover:text-[#F8FAFC]">Cases</Link></li>
            <li><Link href="/blog" className="transition hover:text-[#F8FAFC]">Blog</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#CBD5E1]/70">Áreas</p>
          <ul className="space-y-2 text-sm text-[#CBD5E1]">
            <li><Link href="/ia-para-empresas" className="transition hover:text-[#F8FAFC]">IA para Empresas</Link></li>
            <li><Link href="/desenvolvimento" className="transition hover:text-[#F8FAFC]">Desenvolvimento</Link></li>
            <li><Link href="/marketing" className="transition hover:text-[#F8FAFC]">Marketing</Link></li>
            <li><Link href="/login" className="transition hover:text-[#F8FAFC]">Entrar na plataforma</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#CBD5E1]/70">Contato</p>
          <ul className="space-y-2 text-sm text-[#CBD5E1]">
            {SITE.whatsappUrl && (
              <li><a href={SITE.whatsappUrl} target="_blank" rel="noreferrer" className="transition hover:text-[#F8FAFC]">WhatsApp</a></li>
            )}
            {SITE.email && (
              <li><a href={`mailto:${SITE.email}`} className="transition hover:text-[#F8FAFC]">{SITE.email}</a></li>
            )}
            {SITE.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${SITE.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-[#F8FAFC]"
                >
                  Instagram
                </a>
              </li>
            )}
            {!SITE.whatsappUrl && !SITE.email && !SITE.instagram && (
              <li><Link href="/contato" className="transition hover:text-[#F8FAFC]">Fale com a gente</Link></li>
            )}
            {SITE.address && <li className="text-[#CBD5E1]/70">{SITE.address}</li>}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-[#CBD5E1]/60">
        <span>© {new Date().getFullYear()} FortGrow. Todos os direitos reservados.</span>
        <Link href="/politica-de-privacidade" className="transition hover:text-[#F8FAFC]">Política de Privacidade</Link>
      </div>
    </footer>
  );
}
