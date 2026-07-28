/**
 * Formatos de dados que atravessam a fronteira servidor → cliente no CRM.
 *
 * Decimal e Date do Prisma não são serializáveis para um componente
 * cliente, então as páginas convertem para number/string aqui antes de
 * passar adiante. Um único lugar definindo isso evita o clássico "no
 * servidor é Decimal, no navegador é string, e o total sai errado".
 */

export type StageDto = {
  id: string;
  name: string;
  color: string;
  kind: string;
  position: number;
};

export type MemberDto = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  goal: number;
  active: boolean;
  userId: string | null;
};

export type TagDto = { id: string; name: string; color: string; count?: number };

export type LeadDto = {
  id: string;
  name: string;
  company: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  notes: string | null;
  stageId: string;
  stageName: string;
  stageColor: string;
  stageKind: string;
  estimatedValue: number;
  wonValue: number | null;
  ownerId: string | null;
  ownerName: string | null;
  tags: TagDto[];
  score: number;
  temperature: string;
  probability: number;
  /** ISO — datas viajam como texto e são reidratadas no cliente */
  createdAt: string;
  lastContactAt: string | null;
  nextContactAt: string | null;
  closedAt: string | null;
};

export type ActivityDto = {
  id: string;
  type: string;
  content: string;
  meta: Record<string, unknown>;
  authorName: string | null;
  createdAt: string;
};

export type TaskDto = {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  start: string;
  end: string;
  done: boolean;
  ownerId: string | null;
  ownerName: string | null;
  leadId: string | null;
  leadName: string | null;
  remindMin: number | null;
};

/** Conversões Prisma → DTO. `unknown` porque Decimal só existe no servidor. */
export const toNum = (v: unknown) => Number(v ?? 0);
export const toIso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
