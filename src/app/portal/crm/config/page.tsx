import { redirect } from "next/navigation";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");
  return <CrmWorkspace ctx={ctx} scope={{}} basePath="/portal/crm" tab={["config"]} />;
}
