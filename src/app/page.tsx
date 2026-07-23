import type { Metadata } from "next";
import { Landing } from "@/components/site/landing";

export const metadata: Metadata = {
  title: "FortGrow · Estruturação de Marketing e Performance",
  description:
    "A FortGrow estrutura o marketing da sua empresa de ponta a ponta — do posicionamento ao tráfego pago que vira venda. Estratégia, execução e dados para transformar investimento em resultado previsível.",
};

export default function Home() {
  return <Landing />;
}
