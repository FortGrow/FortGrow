import type { Metadata } from "next";
import { SitePage } from "@/components/site/site-page";

export const metadata: Metadata = { title: "Blog" };

export default function Page() {
  return (
    <SitePage
      eyebrow="Blog"
      title="Conteúdo sobre IA e"
      highlight="crescimento empresarial."
      description="Em breve: artigos, guias e bastidores de como usamos Inteligência Artificial, automação e dados para acelerar empresas. Enquanto isso, que tal conversar com a gente?"
    />
  );
}
