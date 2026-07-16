import { PageHeader } from "@/components/ui/page-header";
import { Download, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

const REPORTS = [
  { type: "leads", title: "Leads e pipeline", desc: "Todas as empresas em prospecção com etapa, origem e valor estimado." },
  { type: "clientes", title: "Carteira de clientes", desc: "Contas ativas, planos, valores mensais e datas de contrato." },
  { type: "financeiro", title: "Faturamento", desc: "Mensalidades, recebimentos, vencimentos e formas de pagamento." },
  { type: "tarefas", title: "Tarefas e produtividade", desc: "Tarefas por responsável, status, prazos e tempo gasto." },
];

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Exportação em CSV (compatível com Excel) — os dashboards podem ser impressos em PDF pelo navegador"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.type} className="card flex items-start gap-4 p-5">
            <span className="rounded-xl bg-grow-500/10 p-2.5 text-grow-400">
              <FileSpreadsheet size={20} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-200">{r.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{r.desc}</p>
            </div>
            <a href={`/api/reports/${r.type}`} className="btn-ghost shrink-0" download>
              <Download size={14} /> CSV
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
