import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { toEmbedUrl, autoThumbnail } from "@/lib/video";
import { NewTrainingForm, DeleteTrainingButton } from "./training-actions";
import { Clock, Film } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTreinamentosPage() {
  const trainings = await prisma.training.findMany({ orderBy: { publishedAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Treinamentos"
        subtitle="Publique vídeos para os clientes — aparecem na aba Treinamentos do portal, estilo Netflix"
      >
        <NewTrainingForm />
      </PageHeader>

      {trainings.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Nenhum treinamento publicado — clique em &quot;Novo treinamento&quot; e cole o link do YouTube/Vimeo.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainings.map((t) => {
            const thumb = t.thumbnailUrl ?? autoThumbnail(t.videoUrl);
            const valid = toEmbedUrl(t.videoUrl) !== null;
            return (
              <div key={t.id} className="card group overflow-hidden p-0">
                <div className="relative aspect-video bg-ink-900">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film size={28} className="text-slate-600" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <DeleteTrainingButton id={t.id} />
                  </div>
                  {t.duration && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur">
                      <Clock size={10} /> {t.duration}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-200">{t.title}</p>
                    <Badge tone="brand">{t.category}</Badge>
                  </div>
                  {t.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                  <p className="mt-2 text-[11px] text-slate-600">
                    {t.publishedAt.toLocaleDateString("pt-BR")}
                    {!valid && <span className="ml-2 font-semibold text-danger">link de vídeo não reconhecido</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
