import type { Lead } from "@prisma/client";

/** DTO serializável do lead — padrão unificado Prospecção/CRM. */
export function leadToDto(l: Lead & { owner?: { name: string } | null }) {
  return {
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName,
    email: l.email,
    phone: l.phone,
    whatsapp: l.whatsapp,
    instagram: l.instagram,
    facebook: l.facebook,
    linkedin: l.linkedin,
    website: l.website,
    source: l.source,
    segment: l.segment,
    city: l.city,
    state: l.state,
    potential: l.potential,
    estimatedValue: Number(l.estimatedValue),
    notes: l.notes,
    stage: l.stage as string,
    prospectStatus: l.prospectStatus,
    firstContactAt: l.firstContactAt ? l.firstContactAt.toISOString().slice(0, 10) : null,
    ownerName: l.owner?.name ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}
