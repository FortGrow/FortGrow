/**
 * Seed do FortGrow CRM — dados de demonstração.
 *
 * Acessos criados:
 *   Admin:        admin@fortgrow.com.br  / admin123
 *   Colaborador:  comercial@fortgrow.com.br / fortgrow123 (Comercial)
 *   Colaborador:  trafego@fortgrow.com.br   / fortgrow123 (Tráfego Pago)
 *   Cliente:      cliente@solaris.com.br    / cliente123  (Portal — Solaris Energia)
 */
import { PrismaClient, Channel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// RNG determinístico para dados reproduzíveis
let rngState = 42;
function rand() {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
}
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.round(between(min, max));

async function main() {
  console.log("🧹 Limpando banco…");
  // Ordem respeita as FKs
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.document.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.clientService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  console.log("👤 Usuários…");
  const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

  const admin = await prisma.user.create({
    data: { name: "Yuri Cavichiolo", email: "admin@fortgrow.com.br", passwordHash: hash("admin123"), role: "ADMIN" },
  });
  const comercial = await prisma.user.create({
    data: { name: "Marina Duarte", email: "comercial@fortgrow.com.br", passwordHash: hash("fortgrow123"), role: "COMERCIAL" },
  });
  const trafego = await prisma.user.create({
    data: { name: "Pedro Santana", email: "trafego@fortgrow.com.br", passwordHash: hash("fortgrow123"), role: "TRAFEGO_PAGO" },
  });
  const consultor = await prisma.user.create({
    data: { name: "Ana Beltrão", email: "consultoria@fortgrow.com.br", passwordHash: hash("fortgrow123"), role: "CONSULTOR" },
  });

  console.log("🏢 Clientes…");
  const clientsData = [
    {
      companyName: "Solaris Energia Solar",
      segment: "Energia",
      city: "Curitiba",
      state: "PR",
      plan: "Growth Plus",
      monthlyValue: 8500,
      contractMonths: 12,
      email: "contato@solaris.com.br",
      instagram: "@solarisenergia",
      website: "https://solaris.com.br",
      status: "ATIVO" as const,
    },
    {
      companyName: "Clínica Vitalle",
      segment: "Saúde",
      city: "São Paulo",
      state: "SP",
      plan: "Performance",
      monthlyValue: 5900,
      contractMonths: 12,
      email: "adm@vitalle.com.br",
      instagram: "@clinicavitalle",
      website: "https://vitalle.com.br",
      status: "ATIVO" as const,
    },
    {
      companyName: "Construtora Horizonte",
      segment: "Construção",
      city: "Florianópolis",
      state: "SC",
      plan: "Essencial",
      monthlyValue: 3900,
      contractMonths: 6,
      email: "mkt@horizonte.eng.br",
      instagram: "@construtorahorizonte",
      website: "https://horizonte.eng.br",
      status: "ATIVO" as const,
    },
    {
      companyName: "Bella Moda Store",
      segment: "Varejo",
      city: "Curitiba",
      state: "PR",
      plan: "Essencial",
      monthlyValue: 2900,
      contractMonths: 6,
      email: "loja@bellamoda.com.br",
      instagram: "@bellamodastore",
      website: "https://bellamoda.com.br",
      status: "INATIVO" as const,
    },
  ];

  const clients = [];
  for (const [i, c] of clientsData.entries()) {
    const start = new Date();
    start.setMonth(start.getMonth() - (6 - i));
    start.setDate(1);
    clients.push(
      await prisma.client.create({
        data: {
          ...c,
          contractStart: start,
          accountManagerId: admin.id,
          consultantId: consultor.id,
          projectStatus: c.status === "ATIVO" ? "Em andamento" : "Encerrado",
        },
      })
    );
  }
  const [solaris, vitalle, horizonte] = clients;

  console.log("🔑 Acessos de clientes…");
  await prisma.user.createMany({
    data: [
      { name: "Carlos Mendes", email: "cliente@solaris.com.br", passwordHash: hash("cliente123"), role: "CLIENTE", clientId: solaris.id },
      { name: "Dra. Paula Reis", email: "cliente@vitalle.com.br", passwordHash: hash("cliente123"), role: "CLIENTE", clientId: vitalle.id },
      { name: "Roberto Lima", email: "cliente@horizonte.eng.br", passwordHash: hash("cliente123"), role: "CLIENTE", clientId: horizonte.id },
    ],
  });

  console.log("🧰 Serviços…");
  const serviceNames = [
    ["Gestão de Tráfego", 2500],
    ["Social Media", 1800],
    ["SEO", 2200],
    ["Sites e Landing Pages", 4500],
    ["Design", 1500],
    ["Consultoria de Marketing", 3000],
    ["Automação e CRM", 2000],
    ["Produção de Vídeos", 2800],
  ] as const;
  const services: Record<string, string> = {};
  for (const [name, price] of serviceNames) {
    const s = await prisma.service.create({ data: { name, basePrice: price } });
    services[name] = s.id;
  }

  const checklist = (items: string[], doneCount: number) =>
    items.map((label, i) => ({ label, done: i < doneCount }));

  await prisma.clientService.createMany({
    data: [
      { clientId: solaris.id, serviceId: services["Gestão de Tráfego"], status: "ATIVO", responsible: "Pedro Santana", startDate: solaris.contractStart!, deadline: null, checklist: checklist(["Setup de contas", "Estrutura de campanhas", "Pixel e conversões", "Otimização semanal"], 3) },
      { clientId: solaris.id, serviceId: services["SEO"], status: "ATIVO", responsible: "Ana Beltrão", startDate: solaris.contractStart!, checklist: checklist(["Auditoria técnica", "Pesquisa de palavras-chave", "Otimização on-page", "Link building"], 2) },
      { clientId: solaris.id, serviceId: services["Social Media"], status: "ATIVO", responsible: "Marina Duarte", startDate: solaris.contractStart!, checklist: checklist(["Planejamento editorial", "Design de posts", "Agendamento"], 3) },
      { clientId: vitalle.id, serviceId: services["Gestão de Tráfego"], status: "ATIVO", responsible: "Pedro Santana", startDate: vitalle.contractStart!, checklist: checklist(["Setup de contas", "Campanhas de captação"], 2) },
      { clientId: vitalle.id, serviceId: services["Sites e Landing Pages"], status: "ATRASADO", responsible: "Ana Beltrão", startDate: vitalle.contractStart!, deadline: new Date(Date.now() - 5 * 86400000), checklist: checklist(["Wireframe", "Layout", "Desenvolvimento", "Publicação"], 2) },
      { clientId: horizonte.id, serviceId: services["Consultoria de Marketing"], status: "ATIVO", responsible: "Ana Beltrão", startDate: horizonte.contractStart!, checklist: checklist(["Diagnóstico", "Plano de ação", "Acompanhamento mensal"], 1) },
    ],
  });

  console.log("📃 Contratos…");
  for (const c of clients) {
    const end = new Date(c.contractStart!);
    end.setMonth(end.getMonth() + (c.contractMonths ?? 12));
    await prisma.contract.create({
      data: {
        clientId: c.id,
        title: `Contrato ${c.plan} — ${c.companyName}`,
        value: Number(c.monthlyValue) * (c.contractMonths ?? 12),
        startDate: c.contractStart!,
        endDate: end,
        status: c.status === "ATIVO" ? "ATIVO" : "ENCERRADO",
        autoRenew: c.status === "ATIVO",
      },
    });
  }

  console.log("🎯 Projetos e tarefas…");
  const projSolaris = await prisma.project.create({
    data: { clientId: solaris.id, name: "Lançamento — Financiamento Solar", status: "EM_ANDAMENTO", priority: "ALTA", startDate: new Date(Date.now() - 20 * 86400000), deadline: new Date(Date.now() + 15 * 86400000), progress: 55 },
  });
  const projVitalle = await prisma.project.create({
    data: { clientId: vitalle.id, name: "Novo site institucional", status: "ATRASADO", priority: "URGENTE", startDate: new Date(Date.now() - 45 * 86400000), deadline: new Date(Date.now() - 5 * 86400000), progress: 70 },
  });
  await prisma.project.create({
    data: { clientId: horizonte.id, name: "Campanha lançamento Residencial Vista Mar", status: "BACKLOG", priority: "MEDIA", deadline: new Date(Date.now() + 40 * 86400000), progress: 0 },
  });
  await prisma.project.create({
    data: { clientId: solaris.id, name: "Rebranding de perfil Instagram", status: "CONCLUIDO", priority: "BAIXA", startDate: new Date(Date.now() - 90 * 86400000), deadline: new Date(Date.now() - 30 * 86400000), progress: 100 },
  });

  await prisma.task.createMany({
    data: [
      { title: "Criar variações de criativo p/ campanha solar", status: "EM_ANDAMENTO", priority: "ALTA", dueDate: new Date(Date.now() + 2 * 86400000), assigneeId: trafego.id, projectId: projSolaris.id, timeSpentMin: 180 },
      { title: "Configurar conversões aprimoradas no GA4", status: "A_FAZER", priority: "MEDIA", dueDate: new Date(Date.now() + 5 * 86400000), assigneeId: trafego.id, projectId: projSolaris.id },
      { title: "Copys da landing page de financiamento", status: "EM_REVISAO", priority: "ALTA", dueDate: new Date(Date.now() + 1 * 86400000), assigneeId: comercial.id, projectId: projSolaris.id, timeSpentMin: 240 },
      { title: "Homologar site Vitalle em staging", status: "EM_ANDAMENTO", priority: "URGENTE", dueDate: new Date(Date.now() - 1 * 86400000), assigneeId: consultor.id, projectId: projVitalle.id, timeSpentMin: 320 },
      { title: "Relatório mensal Horizonte", status: "A_FAZER", priority: "MEDIA", dueDate: new Date(Date.now() + 7 * 86400000), assigneeId: consultor.id },
      { title: "Revisar segmentações Meta Ads Vitalle", status: "CONCLUIDA", priority: "MEDIA", assigneeId: trafego.id, timeSpentMin: 90 },
    ],
  });

  console.log("📣 Campanhas…");
  await prisma.campaign.createMany({
    data: [
      { clientId: solaris.id, name: "[Search] Energia Solar Curitiba", channel: "GOOGLE_ADS", budget: 4000, objective: "Conversões", active: true },
      { clientId: solaris.id, name: "[PMax] Financiamento Solar", channel: "GOOGLE_ADS", budget: 2500, objective: "Leads", active: true },
      { clientId: solaris.id, name: "[Leads] Simulação Grátis", channel: "META_ADS", budget: 3000, objective: "Cadastros", active: true },
      { clientId: vitalle.id, name: "[Search] Clínica Estética SP", channel: "GOOGLE_ADS", budget: 2000, objective: "Agendamentos", active: true },
      { clientId: vitalle.id, name: "[Remarketing] Pacientes", channel: "META_ADS", budget: 1200, objective: "Retorno", active: true },
      { clientId: horizonte.id, name: "[Leads] Residencial Vista Mar", channel: "META_ADS", budget: 1800, objective: "Cadastros", active: false },
    ],
  });

  console.log("📊 Métricas (120 dias)…");
  const channels: { ch: Channel; scale: number }[] = [
    { ch: "GOOGLE_ADS", scale: 1 },
    { ch: "META_ADS", scale: 1.4 },
    { ch: "INSTAGRAM", scale: 0.6 },
    { ch: "SEO", scale: 0.5 },
  ];
  const metricRows = [];
  for (const [ci, client] of [solaris, vitalle, horizonte].entries()) {
    const size = 1 - ci * 0.25; // clientes menores geram menos volume
    let followers = int(3000, 12000);
    for (let d = 120; d >= 0; d--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - d);
      const growth = 1 + (120 - d) / 400; // tendência de melhora ao longo do tempo
      for (const { ch, scale } of channels) {
        const impressions = int(2000, 9000) * scale * size * growth;
        const clicks = impressions * between(0.015, 0.045);
        const leads = ch === "SEO" || ch === "INSTAGRAM" ? clicks * between(0.02, 0.06) : clicks * between(0.08, 0.16);
        const conversions = leads * between(0.15, 0.35);
        const spend = ch === "SEO" || ch === "INSTAGRAM" ? 0 : between(80, 260) * scale * size;
        const revenue = conversions * between(350, 900) * size;
        if (ch === "INSTAGRAM") followers += int(5, 40);
        metricRows.push({
          clientId: client.id,
          channel: ch,
          date,
          impressions: Math.round(impressions),
          clicks: Math.round(clicks),
          reach: Math.round(impressions * between(0.5, 0.8)),
          engagement: ch === "INSTAGRAM" ? int(150, 900) : int(20, 120),
          followers: ch === "INSTAGRAM" ? followers : 0,
          leads: Math.round(leads),
          conversions: Math.round(conversions),
          spend: Math.round(spend * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          organicTraffic: ch === "SEO" ? int(120, 600) : 0,
          avgPosition: ch === "SEO" ? between(4, 14) : 0,
          backlinks: ch === "SEO" ? int(80, 400) : 0,
          authority: ch === "SEO" ? int(18, 42) : 0,
        });
      }
    }
  }
  // Insere em lotes para não estourar o tamanho da query
  for (let i = 0; i < metricRows.length; i += 500) {
    await prisma.metricSnapshot.createMany({ data: metricRows.slice(i, i + 500) });
  }

  console.log("🥅 Metas…");
  const year = new Date().getFullYear();
  await prisma.goal.createMany({
    data: [solaris, vitalle, horizonte].flatMap((c) => [
      { clientId: c.id, metric: "leads", period: "mensal", target: int(150, 400), year, month: new Date().getMonth() + 1 },
      { clientId: c.id, metric: "receita", period: "anual", target: int(300000, 900000), year },
    ]),
  });

  console.log("💰 Financeiro…");
  const methods = ["PIX", "BOLETO", "CARTAO"] as const;
  const invoiceRows = [];
  for (const c of clients) {
    for (let m = 6; m >= 0; m--) {
      const due = new Date();
      due.setMonth(due.getMonth() - m, 10);
      const isPast = m > 0;
      const overdue = m === 0 && c.companyName.includes("Horizonte");
      invoiceRows.push({
        clientId: c.id,
        description: `Mensalidade ${c.plan} — ${due.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
        amount: Number(c.monthlyValue),
        dueDate: due,
        status: isPast ? ("PAGO" as const) : overdue ? ("ATRASADO" as const) : ("EM_ABERTO" as const),
        paidAt: isPast ? new Date(due.getTime() + int(-2, 3) * 86400000) : null,
        method: methods[int(0, 2)],
      });
    }
  }
  await prisma.invoice.createMany({ data: invoiceRows });

  const expenseRows = [];
  const categories: [string, string, number][] = [
    ["midia", "Investimento em mídia (repasse)", 6000],
    ["ferramentas", "Ferramentas e SaaS", 1400],
    ["pessoal", "Folha e freelancers", 9500],
    ["impostos", "Impostos", 2200],
  ];
  for (let m = 6; m >= 0; m--) {
    const date = new Date();
    date.setMonth(date.getMonth() - m, 15);
    for (const [category, description, base] of categories) {
      expenseRows.push({ category, description, amount: Math.round(base * between(0.85, 1.15)), date });
    }
  }
  await prisma.expense.createMany({ data: expenseRows });

  console.log("🗂️ Documentos…");
  await prisma.document.createMany({
    data: [
      { clientId: solaris.id, name: "Contrato Growth Plus 2026.pdf", type: "CONTRATO", url: "#", sizeKb: 420, uploadedBy: "Yuri Cavichiolo" },
      { clientId: solaris.id, name: "Briefing de campanha — Financiamento.pdf", type: "BRIEFING", url: "#", sizeKb: 180, uploadedBy: "Marina Duarte" },
      { clientId: solaris.id, name: "Relatório de performance — Junho.pdf", type: "RELATORIO", url: "#", sizeKb: 950, uploadedBy: "Pedro Santana" },
      { clientId: solaris.id, name: "Criativos aprovados — Julho.zip", type: "CRIATIVO", url: "#", sizeKb: 24500, uploadedBy: "Equipe Design" },
      { clientId: solaris.id, name: "NF-e 000123.pdf", type: "NOTA_FISCAL", url: "#", sizeKb: 85 },
      { clientId: vitalle.id, name: "Contrato Performance 2026.pdf", type: "CONTRATO", url: "#", sizeKb: 410 },
      { clientId: vitalle.id, name: "Apresentação de resultados Q2.pptx", type: "APRESENTACAO", url: "#", sizeKb: 5200 },
      { clientId: horizonte.id, name: "Vídeo institucional v2.mp4", type: "VIDEO", url: "#", sizeKb: 184000 },
    ],
  });

  console.log("🎫 Chamados…");
  const solarisUser = await prisma.user.findUnique({ where: { email: "cliente@solaris.com.br" } });
  const t1 = await prisma.ticket.create({
    data: {
      clientId: solaris.id,
      subject: "Ajustar horário dos posts no Instagram",
      priority: "MEDIA",
      status: "EM_ATENDIMENTO",
      messages: {
        create: [
          { authorId: solarisUser!.id, content: "Olá! Podemos mudar os posts para o período da manhã? Nosso público engaja mais cedo." },
          { authorId: admin.id, content: "Claro, Carlos! Vamos ajustar o calendário editorial para publicações às 8h a partir da próxima semana." },
        ],
      },
    },
  });
  await prisma.ticket.create({
    data: {
      clientId: vitalle.id,
      subject: "Dúvida sobre fatura de julho",
      priority: "BAIXA",
      status: "ABERTO",
      messages: { create: [{ content: "A fatura de julho veio com valor diferente do contratado. Podem verificar?" }] },
    },
  });
  void t1;

  console.log("🧲 Leads e propostas…");
  const leadSeed: [string, string, string, number, string][] = [
    // empresa, etapa, origem, valor, potencial
    ["Auto Center Máxima", "LEAD", "Instagram", 2500, "Médio"],
    ["Restaurante Sabor & Arte", "LEAD", "Indicação", 1800, "Baixo"],
    ["Imobiliária Premium", "CONTATO", "Google", 4500, "Alto"],
    ["Academia PowerFit", "CONTATO", "Prospecção ativa", 2200, "Médio"],
    ["Colégio Nova Era", "DIAGNOSTICO", "Indicação", 5200, "Alto"],
    ["Pet Shop Amigo Fiel", "REUNIAO", "Instagram", 1900, "Médio"],
    ["Advocacia Silveira", "PROPOSTA", "LinkedIn", 3800, "Alto"],
    ["Distribuidora Central", "PROPOSTA", "Google", 6500, "Alto"],
    ["Ótica VisualCare", "NEGOCIACAO", "Indicação", 2700, "Médio"],
    ["Hotel Costa Verde", "FECHADO", "Google", 7200, "Alto"],
    ["Padaria Dois Irmãos", "PERDIDO", "Prospecção ativa", 1200, "Baixo"],
  ];
  for (const [companyName, stage, source, value, potential] of leadSeed) {
    const lead = await prisma.lead.create({
      data: {
        companyName,
        stage: stage as never,
        source,
        estimatedValue: value,
        potential,
        segment: "Serviços",
        city: "Curitiba",
        state: "PR",
        contactName: "Contato Comercial",
        whatsapp: "+55 41 99999-0000",
        ownerId: comercial.id,
        activities: { create: { type: "nota", content: "Lead importado na carga inicial", author: "Sistema" } },
      },
    });
    if (["PROPOSTA", "NEGOCIACAO", "FECHADO"].includes(stage)) {
      await prisma.proposal.create({
        data: {
          leadId: lead.id,
          title: `Proposta — ${companyName}`,
          value,
          status: stage === "FECHADO" ? "ACEITA" : "ENVIADA",
          validUntil: new Date(Date.now() + 15 * 86400000),
        },
      });
    }
  }

  console.log("⚙️ Automações e integrações…");
  await prisma.automation.createMany({
    data: [
      { name: "Aviso de vencimento de fatura", trigger: "vencimento_fatura", channel: "email", active: true },
      { name: "Lembrete de fatura via WhatsApp", trigger: "vencimento_fatura", channel: "whatsapp", active: true },
      { name: "Alerta de renovação de contrato (30 dias)", trigger: "contrato_renovacao", channel: "email", active: true },
      { name: "Notificar tarefa atrasada", trigger: "tarefa_atrasada", channel: "notificacao", active: true },
      { name: "Boas-vindas a novo cliente", trigger: "boas_vindas", channel: "email", active: true },
      { name: "Resumo semanal para clientes", trigger: "relatorio_semanal", channel: "email", active: false },
    ],
  });
  await prisma.integration.createMany({
    data: [
      { provider: "google_ads", connected: true },
      { provider: "meta_ads", connected: true },
      { provider: "instagram", connected: true },
      { provider: "ga4", connected: true },
      { provider: "search_console", connected: true },
      { provider: "asaas", connected: false },
      { provider: "whatsapp", connected: false },
      { provider: "openai", connected: false },
    ],
  });

  console.log("🔔 Notificações…");
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: "Fatura em atraso", body: "Construtora Horizonte está com a mensalidade vencida.", href: "/admin/financeiro" },
      { userId: admin.id, title: "Projeto atrasado", body: "Novo site institucional (Vitalle) passou do prazo.", href: "/admin/projetos" },
      { userId: admin.id, title: "Novo chamado aberto", body: "Dúvida sobre fatura de julho — Clínica Vitalle.", href: "/admin/chamados" },
      { userId: trafego.id, title: "Tarefa próxima do prazo", body: "Criar variações de criativo p/ campanha solar.", href: "/admin/tarefas" },
      { userId: solarisUser!.id, title: "Relatório disponível", body: "Seu relatório de performance de junho já está em Documentos.", href: "/portal/documentos" },
    ],
  });

  console.log("✅ Seed concluído!");
  console.log("   Admin:  admin@fortgrow.com.br / admin123");
  console.log("   Equipe: comercial@fortgrow.com.br, trafego@fortgrow.com.br, consultoria@fortgrow.com.br / fortgrow123");
  console.log("   Portal: cliente@solaris.com.br / cliente123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
