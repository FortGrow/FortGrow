import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SdrChat } from "./sdr-chat";

export const dynamic = "force-dynamic";

export default function SdrPage() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return (
    <>
      <PageHeader
        title="SDR IA"
        subtitle="Assistente de prospecção: analisa empresas, redige abordagens, trata objeções e conduz até a reunião"
      >
        <Link href="/admin/prospeccao" className="btn-ghost">
          <ArrowLeft size={15} /> Voltar à Prospecção
        </Link>
      </PageHeader>
      <SdrChat hasKey={hasKey} />
    </>
  );
}
