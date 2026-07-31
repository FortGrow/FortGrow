import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { fullDate } from "@/lib/utils";
import { FileText, Film, Image as ImageIcon, Presentation, FileBadge, Paintbrush, FileBarChart, File, FileDown, FileSignature, FileCheck2 } from "lucide-react";
import { SignUpload } from "./sign-upload";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  CONTRATO: { label: "Contratos", icon: <FileBadge size={16} />, tone: "text-brand-400 bg-brand-500/10" },
  BRIEFING: { label: "Briefings", icon: <FileText size={16} />, tone: "text-grow-400 bg-grow-500/10" },
  CRIATIVO: { label: "Criativos", icon: <Paintbrush size={16} />, tone: "text-violet bg-violet/10" },
  RELATORIO: { label: "Relatórios", icon: <FileBarChart size={16} />, tone: "text-brand-400 bg-brand-500/10" },
  APRESENTACAO: { label: "Apresentações", icon: <Presentation size={16} />, tone: "text-warn bg-warn/10" },
  NOTA_FISCAL: { label: "Notas fiscais", icon: <FileText size={16} />, tone: "text-grow-400 bg-grow-500/10" },
  PLANEJAMENTO: { label: "Planejamentos", icon: <FileBarChart size={16} />, tone: "text-violet bg-violet/10" },
  VIDEO: { label: "Vídeos", icon: <Film size={16} />, tone: "text-danger bg-danger/10" },
  IMAGEM: { label: "Imagens", icon: <ImageIcon size={16} />, tone: "text-violet bg-violet/10" },
  OUTRO: { label: "Outros", icon: <File size={16} />, tone: "text-slate-400 bg-slate-500/10" },
};

export default async function DocumentosPage() {
  const session = (await getSession())!;
  const [docs, contratos] = await Promise.all([
    prisma.document.findMany({
      where: { clientId: session.clientId! },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contract.findMany({
      where: { clientId: session.clientId!, fileUrl: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const paraAssinar = contratos.filter((c) => !c.signedFileUrl);
  const assinados = contratos.filter((c) => c.signedFileUrl);
  const types = [...new Set(docs.map((d) => d.type))];

  return (
    <>
      <PageHeader title="Documentos" subtitle="Todos os arquivos compartilhados com a sua empresa" />

      {/* Contratos aguardando a assinatura eletrônica do cliente (gov.br) */}
      {paraAssinar.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-warn">
            <FileSignature size={16} /> Contratos aguardando sua assinatura
          </h2>
          <div className="space-y-3">
            {paraAssinar.map((c) => (
              <div key={c.id} className="card border-warn/30 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-100">{c.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      vigência a partir de {fullDate(c.startDate)}
                      {c.endDate ? ` até ${fullDate(c.endDate)}` : " (prazo indeterminado)"}
                    </p>
                  </div>
                  <a href={c.fileUrl!} target="_blank" rel="noreferrer" className="btn-ghost !px-3.5 !py-2 text-xs">
                    <FileDown size={14} /> Baixar contrato {c.fileUrl!.endsWith(".docx") ? "(Word)" : "(PDF)"}
                  </a>
                </div>
                <ol className="mt-3 list-inside list-decimal space-y-1 rounded-xl border border-line/60 bg-ink-900/40 px-4 py-3 text-xs leading-relaxed text-slate-400">
                  {c.fileUrl!.endsWith(".docx") ? (
                    <>
                      <li>Baixe o contrato no botão acima e confira o conteúdo.</li>
                      <li>Abra o arquivo e salve em PDF (Arquivo → Salvar como/Exportar → PDF).</li>
                    </>
                  ) : (
                    <li>Baixe o PDF do contrato no botão acima.</li>
                  )}
                  <li>
                    Acesse{" "}
                    <a
                      href="https://assinador.iti.br"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-400 hover:text-brand-300"
                    >
                      assinador.iti.br
                    </a>{" "}
                    e assine o PDF com a sua conta gov.br (validade jurídica — Lei nº 14.063/2020).
                  </li>
                  <li>Envie aqui o PDF assinado que o gov.br gerar:</li>
                </ol>
                <div className="mt-3">
                  <SignUpload contractId={c.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contratos já assinados */}
      {assinados.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-300">
            <FileCheck2 size={16} className="text-grow-400" /> Contratos assinados
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assinados.map((c) => (
              <a
                key={c.id}
                href={c.signedFileUrl!}
                target="_blank"
                rel="noreferrer"
                className="card flex items-center gap-3 p-4 transition hover:border-line-strong"
              >
                <span className="rounded-xl bg-grow-500/10 p-2.5 text-grow-400">
                  <FileCheck2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-200">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    assinado {c.signedAt ? `em ${fullDate(c.signedAt)}` : ""}
                  </p>
                </div>
                <Badge tone="grow">assinado</Badge>
              </a>
            ))}
          </div>
        </div>
      )}
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
