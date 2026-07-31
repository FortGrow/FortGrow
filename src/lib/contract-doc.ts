import { docPdf, type DocBloco } from "@/lib/pdf";
import { brl } from "@/lib/utils";

/**
 * Gera o PDF do contrato de prestação de serviços a partir do cadastro do
 * cliente — é o documento que aparece no portal para o cliente baixar,
 * assinar eletronicamente no gov.br e devolver assinado.
 *
 * Os dados da FortGrow (razão social/CNPJ/endereço/foro) vêm das chaves
 * `contratada*` em Setting quando configuradas; sem elas, o texto usa o
 * nome fantasia e deixa o campo por preencher.
 */

export type DadosContratada = {
  razao?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  foro?: string | null;
};

export type DadosCliente = {
  companyName: string;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  plan?: string | null;
  billingType: string;
  monthlyValue: number;
  commissionBase: number;
  commissionShare: number;
  closingDay?: number | null;
};

export type DadosContrato = {
  title: string;
  value: number;
  startDate: Date;
  endDate?: Date | null;
  autoRenew: boolean;
};

const data = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/* ————— Estrutura própria (modelo colado pelo admin) ————— */

/** Marcadores aceitos no modelo — mostrados na legenda da tela. */
export const TEMPLATE_PLACEHOLDERS: { chave: string; descricao: string }[] = [
  { chave: "EMPRESA", descricao: "razão social do cliente" },
  { chave: "CNPJ", descricao: "CNPJ do cliente" },
  { chave: "EMAIL", descricao: "e-mail do cliente" },
  { chave: "TELEFONE", descricao: "telefone do cliente" },
  { chave: "CIDADE_UF", descricao: "cidade/UF do cliente" },
  { chave: "PLANO", descricao: "plano contratado" },
  { chave: "VALOR", descricao: "valor mensal (R$)" },
  { chave: "COMISSAO_BASE", descricao: "% base de comissão" },
  { chave: "COMISSAO_REPASSE", descricao: "% de repasse FortGrow" },
  { chave: "DIA_FECHAMENTO", descricao: "dia de fechamento da apuração" },
  { chave: "INICIO", descricao: "data de início da vigência" },
  { chave: "TERMINO", descricao: "data de término (ou prazo indeterminado)" },
  { chave: "DATA_HOJE", descricao: "data da geração do contrato" },
];

/** Os valores de cada marcador para um cliente/contrato. */
export function valoresDoContrato(cliente: DadosCliente, contrato: DadosContrato): Record<string, string> {
  return {
    EMPRESA: cliente.companyName,
    CNPJ: cliente.cnpj ?? "____________________",
    EMAIL: cliente.email ?? "—",
    TELEFONE: cliente.phone ?? "—",
    CIDADE_UF: [cliente.city, cliente.state].filter(Boolean).join("/") || "—",
    PLANO: cliente.plan ?? "—",
    VALOR: brl(contrato.value || cliente.monthlyValue),
    COMISSAO_BASE: `${cliente.commissionBase}%`,
    COMISSAO_REPASSE: `${cliente.commissionShare}%`,
    DIA_FECHAMENTO: cliente.closingDay ? String(cliente.closingDay) : "—",
    INICIO: data(contrato.startDate),
    TERMINO: contrato.endDate ? data(contrato.endDate) : "prazo indeterminado",
    DATA_HOJE: data(new Date()),
  };
}

/** Troca {{MARCADOR}} pelos valores; marcador desconhecido fica como está. */
export function preencherTemplate(body: string, valores: Record<string, string>): string {
  return body.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (m, k: string) => valores[k.toUpperCase()] ?? m);
}

/**
 * Gera o PDF a partir da estrutura colada pelo admin. Parágrafos separam-se
 * por linha em branco; uma linha sozinha em CAIXA-ALTA (ou começando com
 * "CLÁUSULA") vira título de seção; "ASSINATURA:" no começo da linha vira
 * linha de assinatura com régua.
 */
export function gerarContratoDeTemplate(
  titulo: string,
  cliente: DadosCliente,
  contrato: DadosContrato,
  body: string
) {
  const texto = preencherTemplate(body, valoresDoContrato(cliente, contrato));
  const ehTitulo = (linha: string) =>
    /^cl[áa]usula/i.test(linha) ||
    (linha === linha.toUpperCase() && /[A-ZÀ-Ü]{3,}/.test(linha) && linha.length <= 90);

  const blocos: DocBloco[] = [];
  for (const par of texto.split(/\r?\n\s*\r?\n/)) {
    const linhas = par.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) continue;
    let corpo: string[] = [];
    const fechaCorpo = () => {
      if (corpo.length) blocos.push({ tipo: "paragrafo", texto: corpo.join(" ") });
      corpo = [];
    };
    for (const linha of linhas) {
      if (/^assinatura\s*:/i.test(linha)) {
        fechaCorpo();
        blocos.push({ tipo: "assinatura", texto: linha.replace(/^assinatura\s*:\s*/i, "") });
      } else if (ehTitulo(linha)) {
        fechaCorpo();
        blocos.push({ tipo: "titulo", texto: linha });
      } else {
        corpo.push(linha);
      }
    }
    fechaCorpo();
  }
  return docPdf(titulo, `Contrato · ${cliente.companyName} · FortGrow`, blocos);
}

export function gerarContratoPdf(
  cliente: DadosCliente,
  contrato: DadosContrato,
  contratada: DadosContratada
) {
  const razao = contratada.razao?.trim() || "FortGrow — Estruturação de Marketing";
  const foro = contratada.foro?.trim() || "Curitiba/PR";

  const qualificacaoContratada = [
    `CONTRATADA: ${razao}`,
    contratada.cnpj ? `inscrita no CNPJ sob o nº ${contratada.cnpj}` : "CNPJ: ____________________",
    contratada.endereco ? `com sede em ${contratada.endereco}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const cidadeUf = [cliente.city, cliente.state].filter(Boolean).join("/");
  const qualificacaoContratante = [
    `CONTRATANTE: ${cliente.companyName}`,
    cliente.cnpj ? `inscrita no CNPJ sob o nº ${cliente.cnpj}` : "CNPJ: ____________________",
    cidadeUf ? `com sede em ${cidadeUf}` : null,
    cliente.email ? `e-mail ${cliente.email}` : null,
    cliente.phone ? `telefone ${cliente.phone}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const isComissao = cliente.billingType === "COMISSAO";
  let valorTexto: string;
  if (isComissao) {
    valorTexto =
      `Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA remuneração variável de ` +
      `${cliente.commissionBase}% (base de comissão) sobre as vendas apuradas, com repasse de ` +
      `${cliente.commissionShare}% à CONTRATADA` +
      (cliente.monthlyValue > 0 ? `, acrescida de mensalidade fixa de ${brl(cliente.monthlyValue)}` : "") +
      (cliente.closingDay
        ? `. O período de apuração encerra no dia ${cliente.closingDay} de cada mês — a competência apura as vendas do dia ${cliente.closingDay + 1} do mês anterior ao dia ${cliente.closingDay} do mês corrente.`
        : ". A apuração segue o mês civil.");
  } else {
    valorTexto =
      `Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal de ` +
      `${brl(contrato.value || cliente.monthlyValue)}, com vencimento conforme fatura emitida pela CONTRATADA.`;
  }

  const vigenciaTexto = contrato.endDate
    ? `O presente contrato vigora de ${data(contrato.startDate)} a ${data(contrato.endDate)}` +
      (contrato.autoRenew
        ? ", renovando-se automaticamente por iguais períodos caso não haja manifestação em contrário com 30 (trinta) dias de antecedência."
        : ", podendo ser renovado mediante acordo entre as partes.")
    : `O presente contrato vigora por prazo indeterminado a partir de ${data(contrato.startDate)}, podendo ser encerrado por qualquer das partes mediante aviso prévio de 30 (trinta) dias.`;

  const blocos: DocBloco[] = [
    { tipo: "paragrafo", texto: qualificacaoContratada + "." },
    { tipo: "paragrafo", texto: qualificacaoContratante + "." },
    {
      tipo: "paragrafo",
      texto:
        "As partes acima qualificadas celebram o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes.",
    },

    { tipo: "titulo", texto: "CLÁUSULA 1ª — DO OBJETO" },
    {
      tipo: "paragrafo",
      texto:
        `O objeto do presente contrato é a prestação, pela CONTRATADA, de serviços de estruturação de marketing e performance` +
        (cliente.plan ? ` conforme o plano "${cliente.plan}"` : "") +
        `, compreendendo estratégia, gestão de campanhas, produção de conteúdo e acompanhamento de resultados, conforme escopo acordado entre as partes.`,
    },

    { tipo: "titulo", texto: "CLÁUSULA 2ª — DO VALOR E DA FORMA DE PAGAMENTO" },
    { tipo: "paragrafo", texto: valorTexto },

    { tipo: "titulo", texto: "CLÁUSULA 3ª — DA VIGÊNCIA" },
    { tipo: "paragrafo", texto: vigenciaTexto },

    { tipo: "titulo", texto: "CLÁUSULA 4ª — DAS OBRIGAÇÕES DAS PARTES" },
    {
      tipo: "paragrafo",
      texto:
        "A CONTRATADA prestará os serviços com zelo e diligência, mantendo a CONTRATANTE informada sobre o andamento dos trabalhos. A CONTRATANTE fornecerá as informações, acessos e aprovações necessários à execução dos serviços e efetuará os pagamentos nos prazos ajustados.",
    },

    { tipo: "titulo", texto: "CLÁUSULA 5ª — DA CONFIDENCIALIDADE" },
    {
      tipo: "paragrafo",
      texto:
        "As partes manterão sigilo sobre as informações comerciais, estratégicas e de dados a que tiverem acesso em razão deste contrato, obrigação que subsiste por 2 (dois) anos após o seu término.",
    },

    { tipo: "titulo", texto: "CLÁUSULA 6ª — DA RESCISÃO" },
    {
      tipo: "paragrafo",
      texto:
        "O descumprimento de qualquer cláusula autoriza a rescisão motivada por notificação, sem prejuízo das verbas devidas até a data do encerramento.",
    },

    { tipo: "titulo", texto: "CLÁUSULA 7ª — DA ASSINATURA ELETRÔNICA" },
    {
      tipo: "paragrafo",
      texto:
        "As partes reconhecem como válida e eficaz a assinatura eletrônica deste instrumento realizada por meio da plataforma gov.br (assinatura eletrônica avançada ou qualificada, nos termos da Lei nº 14.063/2020 e da MP nº 2.200-2/2001 — ICP-Brasil).",
    },

    { tipo: "titulo", texto: "CLÁUSULA 8ª — DO FORO" },
    {
      tipo: "paragrafo",
      texto: `Fica eleito o foro da comarca de ${foro} para dirimir quaisquer controvérsias oriundas deste contrato.`,
    },

    {
      tipo: "paragrafo",
      texto: `E, por estarem justas e contratadas, as partes assinam o presente instrumento. Gerado em ${data(new Date())}.`,
    },

    { tipo: "assinatura", texto: `${razao} — CONTRATADA` },
    { tipo: "assinatura", texto: `${cliente.companyName} — CONTRATANTE` },
  ];

  return docPdf(
    contrato.title,
    `Contrato de prestação de serviços · ${cliente.companyName} · FortGrow`,
    blocos
  );
}
