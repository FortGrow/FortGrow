import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { fullDate } from "@/lib/utils";
import { FileText, Film, Image as ImageIcon, Presentation, FileBadge, Paintbrush, FileBarChart, File } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  CONTRATO: { label: "Contratos", icon: <FileBadge size={16} />, tone: "text-brand-400 bg-brand-500/10" },
  BRIEFING: { label: "Briefings", icon: <FileText size={16} />, tone: "text-grow-400 bg-grow-500/10" },
  CRIATIVO: { label: "Criativos", icon: <Paintbrush size={16} />, tone: "text-violet bg-violet/10" },
  RELATORIO: { label: "Relatórios", icon: <FileBarChart size={16} />, tone: "text-brand-400 bg-brand-500/10" },
  APRESENTACAO: { label: "Apresentações", icon: <Presentation size={16} />, tone: "text-warn bg-warn/10" },
  NOTA_FISCAL: { label: "Notas fiscais", icon: <FileText size={16} />, tone: "text-grow-400 bg-grow-500/10" },
  VIDEO: { label: "Vídeos", icon: <Film size={16} />, tone: "text-danger bg-danger/10" },
  IMAGEM: { label: "Imagens", icon: <ImageIcon size={16} />, tone: "text-violet bg-violet/10" },
  OUTRO: { label: "Outros", icon: <File size={16} />, tone: "text-slate-400 bg-slate-500/10" },
};

export default async function DocumentosPage() {
  const session = (await getSession())!;
  const docs = await prisma.document.findMany({
    where: { clientId: session.clientId! },
    orderBy: { createdAt: "desc" },
  });

  const types = [...new Set(docs.map((d) => d.type))];

  return (
    <>
      <PageHeader title="Documentos" subtitle="Todos os arquivos compartilhados com a sua empresa" />
      {types.length === 0 && (
        <div className="card p-10 text-center text-sm text-slate-500">Nenhum documento disponível ainda.</div>
      )}
      {types.map((type) => {
        const meta = TYPE_META[type] ?? TYPE_META.OUTRO;
        return (
          <div key={type} className="mb-6">
            <h2 className="mb-3 text-sm font-bold text-slate-300">{meta.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs
                .filter((d) => d.type === type)
                .map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card flex items-center gap-3 p-4 transition hover:border-line-strong"
                  >
                    <span className={`rounded-xl p-2.5 ${meta.tone}`}>{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-200">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        {fullDate(d.createdAt)}
                        {d.sizeKb > 0 && ` · ${d.sizeKb >= 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${d.sizeKb} KB`}`}
                      </p>
                    </div>
                  </a>
                ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
