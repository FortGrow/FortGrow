# FortGrow CRM

CRM SaaS multi-tenant para agências de marketing e consultoria — centraliza comercial, projetos, financeiro, resultados de marketing e atendimento em dois ambientes totalmente separados: **Área Administrativa** (equipe interna) e **Portal do Cliente**.

Interface dark premium, responsiva, com microanimações, pesquisa global (⌘K), Kanban com arrastar-e-soltar e dashboards em tempo real.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Estilo | TailwindCSS (Design System próprio, tema escuro) + Framer Motion |
| Gráficos | Recharts (paleta validada p/ acessibilidade e daltonismo) |
| Banco | PostgreSQL (compatível com Supabase) via Prisma |
| Auth | JWT (jose) em cookie httpOnly + bcrypt + RBAC por módulo |
| API | REST (route handlers) com validação Zod |

## Rodando localmente

```bash
# 1. Banco de dados (ou use uma connection string do Supabase)
docker compose up -d

# 2. Configuração
cp .env.example .env   # ajuste DATABASE_URL e AUTH_SECRET

# 3. Dependências + schema + dados de demonstração
npm install
npm run db:push
npm run db:seed

# 4. Desenvolvimento
npm run dev            # http://localhost:3000
```

### Acessos de demonstração (seed)

| Perfil | E-mail | Senha |
|---|---|---|
| **Administrador** | `admin@fortgrow.com.br` | `admin123` |
| Colaborador (Comercial) | `comercial@fortgrow.com.br` | `fortgrow123` |
| Colaborador (Tráfego Pago) | `trafego@fortgrow.com.br` | `fortgrow123` |
| Colaborador (Consultoria) | `consultoria@fortgrow.com.br` | `fortgrow123` |
| **Cliente (Portal)** | `cliente@solaris.com.br` | `cliente123` |
| Cliente (Portal) | `cliente@vitalle.com.br` | `cliente123` |

## Ambientes

### Área Administrativa (`/admin`)
- **Dashboard geral** — MRR, ARR, churn, LTV, ticket médio, lucro, ROI, fluxo de caixa, funil comercial, projetos e campanhas.
- **CRM Comercial** — pipeline Kanban (Lead → Contato → Diagnóstico → Reunião → Proposta → Negociação → Fechado/Perdido) com drag & drop, histórico e atividades.
- **Prospecção** — cadastro completo de empresas (WhatsApp, Instagram, LinkedIn, origem, segmento, potencial, valor estimado…).
- **Clientes** — ficha completa por conta: serviços, contratos, projetos, faturas, métricas.
- **Serviços** — catálogo da agência + execução por cliente com checklist, responsável e prazo.
- **Contratos** — vigência, renovação automática e alerta de vencimento.
- **Projetos & Tarefas** — Kanban, prioridades, prazos, delegação e tempo gasto.
- **Campanhas** — performance consolidada (CTR, ROAS, investimento) por canal.
- **Faturamento** — recebimentos, despesas, fluxo de caixa e cálculo automático de ROI, ROAS, CAC, LTV, margem e payback.
- **Relatórios** — exportação CSV (Excel) de leads, clientes, financeiro e tarefas.
- **Chamados** — atendimento com chat e mudança de status.
- **Automações** — gatilhos de e-mail/WhatsApp/notificação (vencimentos, renovações, tarefas).
- **Integrações** — catálogo de conexões (Google Ads, Meta Ads, GA4, Search Console, Stripe, Asaas, WhatsApp, OpenAI…).
- **Equipe & Permissões** — papéis (Admin, Financeiro, Comercial, Gestor, Social Media, Designer, Tráfego, Consultor) com módulos liberados por usuário.

### Portal do Cliente (`/portal`)
Cada cliente enxerga **somente os dados da própria empresa** (isolamento por `clientId` no token JWT + checagens no servidor):
- **Visão geral** — plano, valores, vigência, responsável, consultor e serviços em execução.
- **Resultados** — leads, conversões, CAC, ROI, ROAS, CPL, CPA, CTR, impressões, alcance, metas mensal/anual, comparativos e filtros por período (7/30/90/365 dias).
- **Google Ads · Meta Ads · Instagram · SEO** — dashboards por canal.
- **Financeiro** — mensalidades, histórico de pagamentos, notas fiscais e contratos.
- **Documentos** — contratos, briefings, criativos, relatórios, apresentações, vídeos.
- **Chamados** — abertura de tickets com prioridade e chat com a equipe.

## Segurança

- JWT assinado (HS256) em cookie `httpOnly` + middleware de proteção de rotas.
- RBAC: papéis + permissões por módulo sobrescrevíveis por usuário.
- Isolamento multi-tenant em todas as queries do portal.
- Senhas com bcrypt, registro de sessões (IP/user-agent) e logs de auditoria (`ActivityLog`).
- Validação de entrada com Zod em todas as rotas de escrita.

## Estrutura

```
prisma/            # schema (23 modelos) e seed de demonstração
src/middleware.ts  # proteção de rotas /admin e /portal
src/lib/           # auth (JWT), rbac, prisma, métricas (ROI/ROAS/CAC/LTV), utils
src/components/    # design system: cards, tabelas, gráficos, kanban, chamados
src/app/api/       # REST: auth, leads, projects, tasks, tickets, reports, search
src/app/admin/     # área administrativa
src/app/portal/    # portal do cliente
```

## Roadmap (fundações já preparadas)

- Sincronização real das integrações (tabela `Integration` + `MetricSnapshot` por canal/dia).
- Worker de automações (tabela `Automation` com gatilhos e canais).
- Módulo de IA (insights, forecast e previsão de churn via OpenAI/Claude).
- Upload de arquivos para storage (Supabase Storage/S3) na área de documentos.
- 2FA (campo `twoFactor` já presente no modelo de usuário).
