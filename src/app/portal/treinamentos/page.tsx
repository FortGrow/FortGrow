import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { TrainingBrowser } from "@/components/trainings/training-browser";
import type { TrainingDTO } from "@/components/trainings/training-shelf";
import { toEmbedUrl, autoThumbnail } from "@/lib/video";

export const dynamic = "force-dynamic";

export default async function PortalTreinamentosPage() {
  const session = (await getSession())!;
  const [trainings, progress] = await Promise.all([
    prisma.training.findMany({ where: { active: true }, orderBy: { publishedAt: "desc" } }),
    prisma.trainingProgress.findMany({ where: { userId: session.sub }, select: { trainingId: true } }),
  ]);
  const watched = new Set(progress.map((p) => p.trainingId));

  const dto: TrainingDTO[] = trainings.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    embedUrl: toEmbedUrl(t.videoUrl),
    thumbnailUrl: t.thumbnailUrl ?? autoThumbnail(t.videoUrl),
    duration: t.duration,
    publishedAt: t.publishedAt.toISOString(),
    watched: watched.has(t.id),
  }));

  return (
    <>
      <PageHeader
        title="Treinamentos"
        subtitle="Conteúdos por assunto, cada um com sua cor — marque como assistido ao concluir"
      />

      {dto.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Os treinamentos da FortGrow aparecerão aqui em breve. Fique de olho!
        </div>
      ) : (
        <TrainingBrowser initial={dto} />
      )}
    </>
  );
}
