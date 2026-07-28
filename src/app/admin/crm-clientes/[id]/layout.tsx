import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";
import { CrmTabs } from "@/components/crm/crm-tabs";

/**
 * Modo administrador: a FortGrow olhando o CRM de um cliente.
 *
 * Não trocamos a identidade da sessão para "virar" o cliente — isso
 * significaria emitir um token de outra conta e embaralhar o log de
 * auditoria. Em vez disso, a mesma tela é aberta com o tenant apontando
 * para a empresa escolhida, e o que for escrito daqui fica registrado no
 * histórico com o nome do colaborador e a marca "(FortGrow)", para o
 * cliente sempre saber quem mexeu.
 */
export default async function AdminCrmLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const ctx = await requireCrm(params.id);
  if (isCrmError(ctx)) {
    // 403/404 do guard viram navegação, não JSON, porque isto é uma página
    redirect("/admin/crm-clientes");
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    select: { companyName: true },
  });
  if (!client) notFound();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/25 bg-warn/10 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-semibold text-warn">
          <ShieldAlert size={14} />
          Você está no CRM de <strong className="font-bold">{client.companyName}</strong> como administrador
          FortGrow. Toda alteração fica no histórico com o seu nome.
        </p>
        <Link
          href="/admin/crm-clientes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft size={13} /> Todos os CRMs
        </Link>
      </div>

      <CrmTabs basePath={`/admin/crm-clientes/${params.id}`} />
      {children}
    </>
  );
}
