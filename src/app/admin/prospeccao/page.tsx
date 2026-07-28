import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmLeadsView } from "@/components/crm/crm-leads-view";
import { requireCrm, isCrmError, ensureStages, INTERNAL } from "@/lib/crm-tenant";
import { loadBase } from "@/lib/crm-page-data";

/**
 * Prospecção — entrada de leads.
 *
 * Passou a ler o mesmo pipeline do CRM Comercial (espaço interno do motor
 * multi-tenant). Antes eram duas telas sobre a mesma tabela com dois modelos
 * de "status" convivendo (`prospectStatus` e `stage`); agora existe um funil
 * só, e a Prospecção é a porta de entrada dele — o que entra aqui já nasce
 * no CRM, com histórico, score e agenda.
 */
export const dynamic = "force-dynamic";

export default async function ProspeccaoPage() {
  const ctx = await requireCrm(INTERNAL);
  if (isCrmError(ctx)) redirect("/admin");

  await ensureStages(ctx.clientId);
  const base = await loadBase(ctx);
  const scope = { clientId: INTERNAL };

  return (
    <>
      <PageHeader
        title="Prospecção"
        subtitle="Entrada de leads: cadastre um a um, importe uma lista e acompanhe até virar negócio"
      >
        {/* "Novo lead" e "Importar" já vivem na barra da lista, logo abaixo */}
        <Link href="/admin/prospeccao/sdr" className="btn-ghost">
          <Bot size={15} /> SDR IA
        </Link>
      </PageHeader>

      {/* Os cartões abertos daqui levam para a ficha no CRM Comercial */}
      <CrmLeadsView
        stages={base.stages}
        members={base.members}
        tags={base.tags}
        sources={base.sources}
        scope={scope}
        basePath="/admin/crm"
        readOnly={!ctx.canEdit}
      />
    </>
  );
}
