import { redirect } from "next/navigation";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: { id: string } }) {
  const ctx = await requireCrm();
  if (isCrmError(ctx)) redirect("/portal");
  return <CrmWorkspace ctx={ctx} scope={{}} basePath="/portal/crm" tab={["leads", params.id]} />;
}
