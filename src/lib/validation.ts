import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Converte "" em null antes da coerção numérica (inputs vazios de formulário). */
export const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/**
 * Normaliza o Instagram: aceita URL completa (com ?igsh=... etc.), @usuario
 * ou o nome puro, e guarda só o nome do perfil.
 */
export function normalizeInstagram(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return s;
  const m = s.match(/instagram\.com\/@?([A-Za-z0-9._]+)/i);
  if (m) return m[1];
  if (/^https?:\/\/|instagram\.com/i.test(s)) return ""; // URL sem nome de perfil
  return s.replace(/^@+/, "").split(/[?#/\s]/)[0];
}

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
