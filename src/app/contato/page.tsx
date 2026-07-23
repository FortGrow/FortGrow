import type { Metadata } from "next";
import { MessageCircle, Mail } from "lucide-react";
import { SitePage } from "@/components/site/site-page";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = { title: "Contato" };

export default function Page() {
  return (
    <SitePage
      eyebrow="Contato"
      title="Vamos conversar sobre o"
      highlight="crescimento da sua empresa."
      description="Conte pra gente o momento do seu negócio — a primeira conversa é um diagnóstico, não uma venda. Respondemos rápido."
    >
      <div className="mt-7 flex flex-wrap gap-3">
        {SITE.whatsappUrl && (
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-[#F8FAFC] backdrop-blur transition hover:border-white/30 hover:bg-white/10"
          >
            <MessageCircle size={17} /> WhatsApp
          </a>
        )}
        {SITE.email && (
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-[#F8FAFC] backdrop-blur transition hover:border-white/30 hover:bg-white/10"
          >
            <Mail size={17} /> {SITE.email}
          </a>
        )}
      </div>
    </SitePage>
  );
}
