/**
 * Configuração central do site institucional da FortGrow.
 *
 * Todo o conteúdo editável da página inicial vive aqui — textos, números de
 * prova, soluções e contatos. Para ajustar a home, basta mudar os valores
 * abaixo (não é preciso mexer no layout).
 *
 * ⚠️ Contatos: preencha whatsapp / email / instagram com os dados reais da
 * FortGrow. Enquanto ficarem vazios, os botões de contato levam para o login.
 */
export const SITE = {
  // Contatos oficiais — PREENCHER com os dados reais da FortGrow
  whatsapp: "", // ex.: "5511999999999" (só números, com DDI 55)
  email: "", // ex.: "contato@fortgrow.com.br"
  instagram: "", // ex.: "fortgrow"

  whatsappMessage:
    "Olá! Quero estruturar o marketing da minha empresa com a FortGrow.",
};

/** Link do WhatsApp (ou fallback para o login, se ainda não configurado). */
export function whatsappUrl(): string {
  if (!SITE.whatsapp) return "/login";
  const text = encodeURIComponent(SITE.whatsappMessage);
  return `https://wa.me/${SITE.whatsapp}?text=${text}`;
}

/** Link do Instagram (ou vazio se não configurado). */
export function instagramUrl(): string {
  return SITE.instagram ? `https://instagram.com/${SITE.instagram}` : "";
}

/** Destino do CTA principal "Falar com especialista". */
export function ctaHref(): string {
  return SITE.whatsapp ? whatsappUrl() : "#contato";
}

/** Itens do menu — âncoras das seções da home. */
export const NAV_LINKS = [
  { label: "Método", href: "#metodo" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Resultados", href: "#resultados" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

/** Slogan curto da marca (aparece no topo). */
export const SLOGAN = "Nosso negócio é fazer o seu crescer";

/**
 * Números de prova exibidos na home.
 * ⚠️ Ajuste para os números reais da FortGrow.
 */
export const STATS = [
  { value: 40, suffix: "+", label: "Empresas estruturadas" },
  { value: 8, prefix: "R$ ", suffix: "M+", label: "Investimento em mídia gerido" },
  { value: 4.7, suffix: "x", label: "ROAS médio nas contas ativas", decimals: 1 },
  { value: 95, suffix: "%", label: "Clientes que renovam o contrato" },
];

/** Plataformas de mídia em que a FortGrow opera. */
export const PLATFORMS = [
  "Meta Ads",
  "Google Ads",
  "Instagram",
  "TikTok Ads",
  "LinkedIn Ads",
  "YouTube",
];

/** O que entra na estrutura entregue ao cliente (mirror do quadro de entrega). */
export const INCLUDED = [
  "Gestão de tráfego pago",
  "Criativos e conteúdo",
  "Páginas e landing pages",
  "CRM e gestão de vendas",
  "Dashboards de performance",
  "Relatórios e acompanhamento",
];
