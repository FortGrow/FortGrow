import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { PageHeader } from "@/components/ui/page-header";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";

export const dynamic = "force-dynamic";

export default async function ClientePerformancePage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const scope = await allowedClientIds(session);
  if (!canSeeClient(scope, params.id)) {
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        <h1 className="text-lg font-bold text-danger">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-400">Você só pode ver os clientes vinculados a você por comissão.</p>
        <Link href="/admin/clientes" className="btn-ghost mt-5 inline-flex">Voltar para meus clientes</Link>
      </div>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    select: { id: true, companyName: true },
  });
  if (!client) notFound();

  return (
    <>
      <PageHeader
        title={`Performance · ${client.companyName}`}
        subtitle="Lançamentos manuais com KPIs e evolução calculados automaticamente"
      >
        <Link href={`/admin/clientes/${client.id}`} className="btn-ghost">
          <ArrowLeft size={15} /> Voltar ao cliente
        </Link>
      </PageHeader>

      <PerformanceDashboard clientId={client.id} editable={can(session, "clientes", "edit")} />
    </>
  );
}
