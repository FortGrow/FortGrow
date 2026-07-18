import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Converte "" em null antes da coerção numérica (inputs vazios de formulário). */
export const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** Rótulos pt-BR dos campos para mensagens de validação. */
const FIELD_LABELS: Record<string, string> = {
  companyName: "Empresa",
  contactName: "Contato",
  cnpj: "CNPJ",
  segment: "Segmento",
  email: "E-mail",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  website: "Site",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  city: "Cidade",
  state: "UF",
  plan: "Plano",
  status: "Status",
  billingType: "Tipo de contrato",
  monthlyValue: "Valor mensal",
  commissionBase: "Base de comissão",
  commissionShare: "Percentual FortGrow",
  contractStart: "Início do contrato",
  contractMonths: "Tempo de contrato (meses)",
  projectStatus: "Status do projeto",
  potential: "Potencial",
  estimatedValue: "Valor estimado",
  source: "Origem",
  notes: "Observações",
};

/** Resposta 400 apontando o primeiro campo inválido, em vez do genérico "Dados inválidos." */
export function invalidResponse(error: ZodError) {
  const issue = error.issues[0];
  const key = String(issue?.path?.[0] ?? "");
  const label = FIELD_LABELS[key] ?? key;
  const message = label
    ? `Dados inválidos no campo "${label}". Confira o valor e tente novamente.`
    : "Dados inválidos.";
  return NextResponse.json({ error: message }, { status: 400 });
}
