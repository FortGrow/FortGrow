import { redirect } from "next/navigation";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { requireCrm, isCrmError, INTERNAL } from "@/lib/crm-tenant";

export const dynamic = "force-dynamic";

export default async function CrmComercialPage({ params }: { params: { tab?: string[] } }) {
  const ctx = await requireCrm(INTERNAL);
  if (isCrmError(ctx)) redirect("/admin");

  return (
    <CrmWorkspace
      ctx={ctx}
      scope={{ clientId: INTERNAL }}
      basePath="/admin/crm"
      tab={params.tab}
      titulos={{
        titulo: "CRM Comercial",
        subtitulo: "O pipeline da FortGrow — os mesmos recursos que entregamos aos clientes",
      }}
    />
  );
}
