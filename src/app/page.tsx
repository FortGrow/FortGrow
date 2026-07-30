import type { Metadata } from "next";
import { Landing } from "@/components/site/landing";

/**
 * Título e descrição vêm do layout raiz (que os lê de `SITE`), então a aba do
 * navegador, o resultado no Google e a prévia do link no WhatsApp contam
 * sempre a mesma história.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Landing />;
}
