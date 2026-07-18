import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** O dashboard de performance agora É a Visão geral do portal. */
export default function PortalPerformancePage() {
  redirect("/portal");
}
