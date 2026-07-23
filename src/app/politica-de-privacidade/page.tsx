import type { Metadata } from "next";
import { SitePage } from "@/components/site/site-page";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Page() {
  return (
    <SitePage
      eyebrow="Legal"
      title="Política de"
      highlight="Privacidade."
      description="O texto completo da política de privacidade da FortGrow será publicado aqui. Dúvidas sobre dados e privacidade? Fale com a gente."
    />
  );
}
