import type { Metadata } from "next";
import { SitePage } from "@/components/site/site-page";

export const metadata: Metadata = { title: "Marketing" };

export default function Page() {
  return (
    <SitePage
      eyebrow="Marketing"
      title="Marketing digital guiado por"
      highlight="dados e performance."
      description="Tráfego pago, conteúdo e funis de venda conectados a dashboards de resultado — o investimento vai para onde dá retorno, e você acompanha tudo em tempo real."
    >
      <div className="mt-7 flex flex-wrap gap-2.5">
        {["Geração de Leads", "Tráfego Pago", "Social Media", "Funis de Venda", "Analytics"].map((t) => (
          <span key={t} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#F8FAFC] backdrop-blur">
            {t}
          </span>
        ))}
      </div>
    </SitePage>
  );
}
