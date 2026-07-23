/**
 * Contatos e links do site institucional (Home pública).
 * Preencha os valores reais — botões que dependem deles se ajustam sozinhos:
 * sem WhatsApp configurado, os CTAs levam para /contato.
 */
export const SITE = {
  /** Ex.: "https://wa.me/5541999999999" — deixe "" para ocultar os botões de WhatsApp */
  whatsappUrl: "",
  /** Ex.: "contato@fortgrow.com.br" — deixe "" para ocultar */
  email: "",
  /** Ex.: "@fortgrow" (Instagram) — deixe "" para ocultar */
  instagram: "",
  /** Endereço exibido no rodapé — deixe "" para ocultar */
  address: "",
};

/** Destino do CTA principal: WhatsApp quando configurado, senão a página de contato */
export const diagnosisHref = () => SITE.whatsappUrl || "/contato";
