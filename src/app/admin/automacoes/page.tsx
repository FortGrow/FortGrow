import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Bell, Sparkles } from "lucide-react";
import { RunAutomationsButton } from "./run-button";

export const dynamic = "force-dynamic";

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  email: <Mail size={16} />,
  whatsapp: <MessageCircle size={16} />,
  notificacao: <Bell size={16} />,
};

const TRIGGER_LABEL: Record<string, string> = {
  vencimento_fatura: "Fatura próxima do vencimento",
  contrato_renovacao: "Contrato próximo da renovação",
  tarefa_atrasada: "Tarefa atrasada",
  tarefa_atribuida: "Tarefa atribuída",
  novo_lead: "Novo lead recebido",
  relatorio_semanal: "Relatório semanal do cliente",
  boas_vindas: "Boas-vindas a novo cliente",
};

export default async function AutomacoesPage() {
  const automations = await prisma.automation.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Automações"
        subtitle="Gatilhos de e-mail, WhatsApp e notificações — execute sob demanda ou agende via cron (npm run automations:run)"
      >
        <RunAutomationsButton />
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {automations.map((a) => (
          <div key={a.id} className="card flex items-center gap-4 p-5">
            <span className="rounded-xl bg-violet/10 p-2.5 text-violet">
              {CHANNEL_ICON[a.channel] ?? <Sparkles size={16} />}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-200">{a.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Gatilho: {TRIGGER_LABEL[a.trigger] ?? a.trigger} · canal: {a.channel}
              </p>
            </div>
            <Badge tone={a.active ? "grow" : "slate"}>{a.active ? "ATIVA" : "PAUSADA"}</Badge>
          </div>
        ))}
      </div>
    </>
  );
}
