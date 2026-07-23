import type { Metadata } from "next";
import { SitePage } from "@/components/site/site-page";

export const metadata: Metadata = { title: "Desenvolvimento" };

export default function Page() {
  return (
    <SitePage
      eyebrow="Desenvolvimento"
      title="Sistemas sob medida para"
      highlight="operações que crescem."
      description="Sites de alta conversão, aplicativos mobile, dashboards e sistemas personalizados — construídos com a stack moderna (React, Next.js, Flutter, Node.js) e integrados aos seus processos."
    >
      <div className="mt-7 flex flex-wrap gap-2.5">
        {["Sites", "Aplicativos", "Sistemas personalizados", "Dashboards", "Integrações"].map((t) => (
          <span key={t} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#F8FAFC] backdrop-blur">
            {t}
          </span>
        ))}
      </div>
    </SitePage>
  );
}
