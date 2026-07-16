import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { IntegrationCard } from "./integration-card";

export const dynamic = "force-dynamic";

const CATALOG: { provider: string; name: string; group: string }[] = [
  { provider: "google_ads", name: "Google Ads", group: "Mídia" },
  { provider: "meta_ads", name: "Meta Ads", group: "Mídia" },
  { provider: "tiktok_ads", name: "TikTok Ads", group: "Mídia" },
  { provider: "ga4", name: "Google Analytics 4", group: "Analytics" },
  { provider: "search_console", name: "Google Search Console", group: "Analytics" },
  { provider: "gtm", name: "Google Tag Manager", group: "Analytics" },
  { provider: "instagram", name: "Instagram", group: "Social" },
  { provider: "facebook", name: "Facebook", group: "Social" },
  { provider: "linkedin", name: "LinkedIn", group: "Social" },
  { provider: "whatsapp", name: "WhatsApp Business API", group: "Comunicação" },
  { provider: "gmail", name: "Gmail", group: "Comunicação" },
  { provider: "outlook", name: "Outlook", group: "Comunicação" },
  { provider: "slack", name: "Slack", group: "Comunicação" },
  { provider: "teams", name: "Microsoft Teams", group: "Comunicação" },
  { provider: "discord", name: "Discord", group: "Comunicação" },
  { provider: "stripe", name: "Stripe", group: "Pagamentos" },
  { provider: "asaas", name: "Asaas", group: "Pagamentos" },
  { provider: "mercado_pago", name: "Mercado Pago", group: "Pagamentos" },
  { provider: "openpix", name: "OpenPix", group: "Pagamentos" },
  { provider: "google_calendar", name: "Google Calendar", group: "Produtividade" },
  { provider: "google_drive", name: "Google Drive", group: "Produtividade" },
  { provider: "onedrive", name: "OneDrive", group: "Produtividade" },
  { provider: "dropbox", name: "Dropbox", group: "Produtividade" },
  { provider: "rd_station", name: "RD Station", group: "CRM externo" },
  { provider: "hubspot", name: "HubSpot", group: "CRM externo" },
  { provider: "pipedrive", name: "Pipedrive", group: "CRM externo" },
  { provider: "openai", name: "OpenAI (assistente de IA)", group: "IA" },
];

export default async function IntegracoesPage() {
  const rows = await prisma.integration.findMany();
  const connected = new Set(rows.filter((r) => r.connected).map((r) => r.provider));
  const groups = [...new Set(CATALOG.map((c) => c.group))];

  return (
    <>
      <PageHeader
        title="Integrações"
        subtitle="Conecte as plataformas para sincronizar métricas, cobranças e comunicação"
      />
      {groups.map((g) => (
        <div key={g} className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-slate-300">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG.filter((c) => c.group === g).map((c) => (
              <IntegrationCard key={c.provider} provider={c.provider} name={c.name} connected={connected.has(c.provider)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
