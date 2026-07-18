import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allowedClientIds, canSeeClient } from "@/lib/client-scope";
import { PageHeader } from "@/components/ui/page-header";
import { metaDashboard } from "@/lib/ads-dashboard";
import { MetaAdsDashboard } from "@/components/ads/meta-dashboard";

export const dynamic = "force-dynamic";

export default async function ClienteCampanhasPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { dias?: string; campanha?: string; status?: string };
}) {
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

  const days = Number(searchParams.dias ?? 30);
  const data = await metaDashboard(client.id, {
    days,
    campaignId: searchParams.campanha,
    status: searchParams.status,
  });

  return (
    <>
      <PageHeader
        title={`Campanhas Meta · ${client.companyName}`}
        subtitle="Dados sincronizados automaticamente do Gerenciador de Anúncios (Facebook/Instagram)"
      >
        <Link href={`/admin/clientes/${client.id}`} className="btn-ghost">
          <ArrowLeft size={15} /> Voltar ao cliente
        </Link>
      </PageHeader>

      <MetaAdsDashboard
        data={data}
        basePath={`/admin/clientes/${client.id}/campanhas`}
        days={[7, 30, 90].includes(days) ? days : 30}
        campaignId={searchParams.campanha}
        status={searchParams.status}
        syncClientId={client.id}
      />
    </>
  );
}
