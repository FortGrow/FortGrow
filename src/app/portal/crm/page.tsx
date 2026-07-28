import { redirect } from "next/navigation";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";

export const dynamic = "force-dynamic";

export default async function MeuCrmPage() {
  const ctx = await requireCrm();
  // O middleware já barrou quem não pode; aqui é a última rede de proteção
  if (isCrmError(ctx)) redirect("/portal");

  return (
    <CrmWorkspace
      ctx={ctx}
      scope={{}}
      basePath="/portal/crm"
      titulos={{
        titulo: "Meu CRM",
        subtitulo: "Seus leads, seu funil e seus números — dados exclusivos da sua empresa",
      }}
    />
  );
}
