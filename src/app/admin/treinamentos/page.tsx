import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { toEmbedUrl, autoThumbnail } from "@/lib/video";
import { categoryColor } from "@/lib/trainings";
import { NewTrainingForm, DeleteTrainingButton } from "./training-actions";
import { CheckCircle2, Clock, Film } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTreinamentosPage() {
  const [trainings, watchedAgg] = await Promise.all([
    prisma.training.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.trainingProgress.groupBy({ by: ["trainingId"], _count: { _all: true } }),
  ]);
  const watchedCount = new Map(watchedAgg.map((w) => [w.trainingId, w._count._all]));
  const categories = [...new Set(trainings.map((t) => t.category))];

  return (
    <>
      <PageHeader
        title="Treinamentos"
        subtitle="Segmentado por assunto, cada um com sua cor — os vídeos aparecem no portal estilo Netflix"
      >
        <NewTrainingForm />
      </PageHeader>

      {trainings.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Nenhum treinamento publicado — clique em &quot;Novo treinamento&quot; e cole o link do YouTube/Vimeo.
        </div>
      ) : (
        categories.map((cat) => {
          const color = categoryColor(cat);
          const items = trainings.filter((t) => t.category === cat);
          return (
            <div key={cat} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
                  {cat}
                </h2>
                <span className="text-xs text-slate-600">{items.length} vídeo{items.length > 1 ? "s" : ""}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => {
                  const thumb = t.thumbnailUrl ?? autoThumbnail(t.videoUrl);
                  const valid = toEmbedUrl(t.videoUrl) !== null;
                  const views = watchedCount.get(t.id) ?? 0;
                  return (
                    <div key={t.id} className="card group overflow-hidden p-0" style={{ boxShadow: `0 0 0 1px ${color}44` }}>
                      <div className="relative aspect-video bg-ink-900">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film size={28} className="text-slate-600" />
                          </div>
                        )}
                        <div
                          className="absolute inset-x-0 bottom-0 h-1/3"
                          style={{ background: `linear-gradient(to top, ${color}59, transparent)` }}
                        />
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
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ color, backgroundColor: `${color}1a`, boxShadow: `inset 0 0 0 1px ${color}44` }}
                          >
                            {t.category}
                          </span>
                        </div>
                        {t.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                        <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                          {t.publishedAt.toLocaleDateString("pt-BR")}
                          <span className="inline-flex items-center gap-1 text-grow-500">
                            <CheckCircle2 size={11} /> {views} assistiu{views === 1 ? "" : "ram"} por completo
                          </span>
                          {!valid && <span className="font-semibold text-danger">link de vídeo não reconhecido</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
