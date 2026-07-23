import type { Metadata } from "next";
import { SitePage } from "@/components/site/site-page";

export const metadata: Metadata = { title: "IA para Empresas" };

export default function Page() {
  return (
    <SitePage
      eyebrow="IA para Empresas"
      title="Inteligência Artificial trabalhando"
      highlight="pela sua empresa."
      description="Agentes de IA que atendem, qualificam e vendem; automação de processos que devolve horas pro seu time; decisões guiadas por dados. Levamos a IA da teoria para a operação do dia a dia."
    >
      <div className="mt-7 flex flex-wrap gap-2.5">
        {["Agentes de IA", "Automação de Atendimento", "Automação Comercial", "Integrações", "Business Intelligence"].map((t) => (
          <span key={t} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#F8FAFC] backdrop-blur">
            {t}
          </span>
        ))}
      </div>
    </SitePage>
  );
}
