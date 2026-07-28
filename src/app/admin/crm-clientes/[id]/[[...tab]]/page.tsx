import { redirect } from "next/navigation";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";

export const dynamic = "force-dynamic";

export default async function AdminCrmTabPage({
  params,
}: {
  params: { id: string; tab?: string[] };
}) {
  const ctx = await requireCrm(params.id);
  if (isCrmError(ctx)) redirect("/admin/crm-clientes");

  return (
    <CrmWorkspace
      ctx={ctx}
      scope={{ clientId: params.id }}
      basePath={`/admin/crm-clientes/${params.id}`}
      tab={params.tab}
      titulos={{
        titulo: "Painel do CRM",
        subtitulo: "Os mesmos números que a empresa enxerga no Portal",
      }}
    />
  );
}
