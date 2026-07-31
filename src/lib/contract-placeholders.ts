/**
 * Marcadores aceitos nos modelos de contrato — em módulo próprio (sem
 * fs/prisma) porque a legenda do editor roda no navegador e o gerador de
 * PDF roda no servidor; os dois importam daqui.
 */
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
