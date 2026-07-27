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
  // Link direto do WhatsApp (click-to-chat). Tem prioridade sobre o número.
  whatsappLink: "https://wa.me/message/BZPPXKFGWV2EC1",
  // Contatos oficiais — PREENCHER com os dados reais da FortGrow
  whatsapp: "", // ex.: "5511999999999" (só números, com DDI 55)
  email: "", // ex.: "contato@fortgrow.com.br"
  instagram: "", // ex.: "fortgrow"

  whatsappMessage:
    "Olá! Quero estruturar o marketing da minha empresa com a FortGrow.",
};

/** Link do WhatsApp (link direto tem prioridade; senão monta pelo número). */
export function whatsappUrl(): string {
  if (SITE.whatsappLink) return SITE.whatsappLink;
  if (!SITE.whatsapp) return "/login";
  const text = encodeURIComponent(SITE.whatsappMessage);
  return `https://wa.me/${SITE.whatsapp}?text=${text}`;
}

/** Há um WhatsApp configurado (link direto ou número)? */
export function hasWhatsapp(): boolean {
  return Boolean(SITE.whatsappLink || SITE.whatsapp);
}

/** Faixas de faturamento mensal (qualificação do lead no formulário). */
export const REVENUE_RANGES = [
  "Até R$ 10 mil/mês",
  "R$ 10 mil a R$ 50 mil/mês",
  "R$ 50 mil a R$ 100 mil/mês",
  "R$ 100 mil a R$ 500 mil/mês",
  "Acima de R$ 500 mil/mês",
];

/** Link do Instagram (ou vazio se não configurado). */
export function instagramUrl(): string {
  return SITE.instagram ? `https://instagram.com/${SITE.instagram}` : "";
}

/** Destino do CTA principal "Falar com especialista". */
export function ctaHref(): string {
  return hasWhatsapp() ? whatsappUrl() : "#contato";
}

/** Itens do menu — âncoras das seções da home. */
export const NAV_LINKS = [
  { label: "O problema", href: "#problema" },
  { label: "Como funciona", href: "#metodo" },
  { label: "Equipe", href: "#equipe" },
  { label: "Planos", href: "#planos" },
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Clientes", href: "#clientes" },
  { label: "Contato", href: "#contato" },
];

/**
 * Time da FortGrow — fotos em /public/site/team.
 * `accent` é a cor da moldura neon do card.
 */
export const TEAM: {
  slug: string;
  name: string;
  role: string;
  bio: string;
  accent: string;
}[] = [
  {
    slug: "emily-tavares",
    name: "Emily Tavares",
    role: "Diretora Criativa",
    bio: "Lidera a criação de conteúdos, campanhas e produções audiovisuais, transformando estratégias em comunicação que gera conexão e resultados.",
    accent: "#60a5fa",
  },
  {
    slug: "yuri-cavichiolo",
    name: "Yuri Cavichiolo",
    role: "CEO e Diretor Estratégico",
    bio: "Lidera o desenvolvimento de estratégias e métodos que transformam negócios em operações mais previsíveis, eficientes e escaláveis.",
    accent: "#2d7ef2",
  },
  {
    slug: "thiago-lamin",
    name: "Thiago Lamin",
    role: "Gestor de Tráfego",
    bio: "Atua com tráfego pago, estratégias de aquisição de clientes e otimização de campanhas digitais para geração de resultados.",
    accent: "#38bdf8",
  },
];

/** Slogan curto da marca (aparece no topo). */
export const SLOGAN = "Estruturação de Marketing";

/**
 * Empresas impactadas (prova social — logos extraídas da apresentação
 * oficial, em /public/site/clients). name = alt/title da imagem.
 */
export const CLIENTS: { slug: string; name: string }[] = [
  { slug: "ioa-boutique", name: "IOA Boutique" },
  { slug: "dsm-multimarcas", name: "DSM Multimarcas" },
  { slug: "realbrand", name: "Realbrand Negócios Imobiliários" },
  { slug: "ded-garage", name: "DED Garage" },
  { slug: "conectevisto", name: "Conecte Visto" },
  { slug: "santos-autos", name: "Santos Autos" },
  { slug: "strike-fire", name: "Strike Fire" },
  { slug: "escola", name: "Escola" },
  { slug: "cacau-show", name: "Cacau Show" },
  { slug: "autocash", name: "AutoCash Soluções Financeiras" },
  { slug: "rb-transportes", name: "RB Transportes" },
  { slug: "lopes-gold", name: "Lopes Gold" },
  { slug: "casa-refacto", name: "Casa Refacto" },
  { slug: "unipizza", name: "UniPizza" },
  { slug: "seals-consultoria", name: "Seals Consultoria" },
  { slug: "beatriz-sprada", name: "Beatriz Sprada" },
  { slug: "zahara", name: "Zahara" },
  { slug: "poder-consignacao", name: "O Poder da Consignação" },
  { slug: "raro-veiculos", name: "Raro Veículos" },
  { slug: "estetica-pro", name: "Programa Estética Pró" },
];

/**
 * Comparativo de planos personalizados.
 *
 * `PLAN_TOPICS` são as entregas possíveis (as linhas da tabela) e cada
 * cliente em `CLIENT_PLANS` lista quais delas entram no seu plano — o
 * check da tabela sai daí. Para ajustar um plano basta incluir ou remover
 * a chave do tópico em `includes`.
 */
export const PLAN_TOPICS: { key: string; label: string }[] = [
  { key: "diagnostico", label: "Diagnóstico Estratégico" },
  { key: "posicionamento", label: "Posicionamento de Marca" },
  { key: "conteudo", label: "Geração de Conteúdo" },
  { key: "audiovisual", label: "Produção Audiovisual" },
  { key: "trafego", label: "Gestão de Tráfego Pago" },
  { key: "demanda", label: "Geração de Demanda" },
  { key: "vendas", label: "CRM & Estruturação de Vendas" },
  { key: "dashboards", label: "Dashboards & Relatórios" },
];

export const CLIENT_PLANS: {
  slug: string;
  name: string;
  /** logo em /public/site/clients (sem logo, entra o selo tipográfico) */
  logo?: string;
  plan: string;
  summary: string;
  accent: string;
  includes: string[];
}[] = [
  {
    slug: "strike-fire",
    name: "Strike Fire",
    logo: "/site/clients/strike-fire.png",
    plan: "Posicionamento & Conteúdo",
    summary:
      "Plano voltado para posicionamento de marca e geração de conteúdo: construir autoridade e presença antes de escalar mídia.",
    accent: "#60a5fa",
    includes: ["diagnostico", "posicionamento", "conteudo", "audiovisual", "dashboards"],
  },
  {
    slug: "poder-consignacao",
    name: "O Poder da Consignação",
    logo: "/site/clients/poder-consignacao.png",
    plan: "Tráfego & Vendas",
    summary:
      "Plano voltado para gestão de tráfego, geração de demanda e vendas: volume qualificado entrando e um processo comercial para converter.",
    accent: "#38bdf8",
    includes: ["diagnostico", "trafego", "demanda", "vendas", "dashboards"],
  },
  {
    slug: "axton-capital",
    name: "Axton Capital",
    plan: "Estruturação 360",
    summary:
      "Estruturação 360 de marketing: tráfego pago, posicionamento e vendas operando juntos, da marca ao fechamento.",
    accent: "#2d7ef2",
    includes: [
      "diagnostico",
      "posicionamento",
      "conteudo",
      "audiovisual",
      "trafego",
      "demanda",
      "vendas",
      "dashboards",
    ],
  },
];

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
