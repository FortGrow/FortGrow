import type { Metadata } from "next";
import { Landing } from "@/components/site/landing";

export const metadata: Metadata = {
  title: "FortGrow — Transformando empresas através da Inteligência Artificial",
  description:
    "Criamos soluções inteligentes para automatizar processos, acelerar vendas e impulsionar o crescimento do seu negócio: IA, automação, CRM, sistemas e marketing de performance.",
};

/** Home institucional pública da FortGrow. */
export default function HomePage() {
  return <Landing />;
}
