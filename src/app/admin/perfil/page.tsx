import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = (await getSession())!;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, phone: true, avatarUrl: true, role: true },
  });
  if (!user) return null;

  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Foto, dados pessoais e senha de acesso" />
      <ProfileForm user={user} />
    </>
  );
}
