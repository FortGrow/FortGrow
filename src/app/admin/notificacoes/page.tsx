import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationList } from "@/components/notifications/notification-list";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const session = (await getSession())!;
  const notifications = await prisma.notification.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader title="Notificações" subtitle="Central de avisos do sistema" />
      <NotificationList
        notifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
