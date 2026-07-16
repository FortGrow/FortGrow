# Colocando o FortGrow CRM na nuvem

Três caminhos, do mais rápido ao mais flexível. Em todos, ao final rode o seed
uma única vez para criar o usuário administrador e os dados iniciais.

---

## Opção 1 — Render (mais rápido: 1 clique, app + banco juntos)

1. Acesse **https://render.com/deploy?repo=https://github.com/FortGrow/FortGrow**
   (crie uma conta gratuita no Render se ainda não tiver).
2. O blueprint (`render.yaml`) provisiona automaticamente:
   - o web service Next.js (com `prisma db push` no build);
   - o banco PostgreSQL gerenciado (`DATABASE_URL` já conectada);
   - `AUTH_SECRET` gerado com valor aleatório;
   - um disco persistente de 1 GB para os uploads de documentos.
3. Quando o deploy terminar, abra o **Shell** do serviço no painel do Render e rode:
   ```bash
   npm run db:seed
   ```
4. Pronto: o CRM estará em `https://fortgrow-crm.onrender.com` (ou similar).

> Custo: os planos `starter` (web) e `basic-256mb` (banco) são os menores pagos
> do Render (~US$ 7 + US$ 6/mês). Para testar de graça, troque `plan: starter`
> por `plan: free` e remova o bloco `disk` do `render.yaml` (uploads não
> persistem entre deploys no plano free).

## Opção 2 — Vercel + Supabase (melhor para produção Next.js)

1. **Banco**: crie um projeto no [Supabase](https://supabase.com) (free tier) e
   copie a connection string em *Settings → Database → Connection string (URI)* —
   use a porta 6543 (pooler) com `?pgbouncer=true` para a aplicação.
2. **App**: em [vercel.com/new](https://vercel.com/new), importe o repositório
   `FortGrow/FortGrow` e configure as variáveis de ambiente:
   - `DATABASE_URL` → connection string do Supabase
   - `AUTH_SECRET` → um valor aleatório longo (`openssl rand -base64 48`)
   - `OPENAI_API_KEY` → opcional, habilita os resumos executivos de IA
3. Deploy. Depois, no seu computador, aplique o schema e o seed apontando para o
   banco de produção:
   ```bash
   DATABASE_URL="<string do Supabase (porta 5432, sem pgbouncer)>" npx prisma db push
   DATABASE_URL="<idem>" npm run db:seed
   ```
4. **Uploads**: o filesystem da Vercel é somente leitura — antes de usar o módulo
   de documentos em produção na Vercel, migre o destino de gravação em
   `src/app/api/documents/route.ts` para Supabase Storage ou S3 (o download já é
   centralizado em `/api/files`, então só o upload muda).

## Opção 3 — Docker em qualquer VPS (Hetzner, DigitalOcean, EC2…)

```bash
git clone https://github.com/FortGrow/FortGrow.git && cd FortGrow
docker compose up -d                       # sobe o PostgreSQL
docker build -t fortgrow-crm .
docker run -d --name fortgrow -p 3000:3000 \
  -e DATABASE_URL="postgresql://fortgrow:fortgrow@host.docker.internal:5432/fortgrow" \
  -e AUTH_SECRET="$(openssl rand -base64 48)" \
  -v fortgrow_uploads:/app/uploads \
  --add-host host.docker.internal:host-gateway \
  fortgrow-crm

# Uma única vez: schema + dados iniciais
docker exec fortgrow npx prisma db push
docker exec fortgrow node_modules/.bin/prisma db seed 2>/dev/null || true
```

Coloque um proxy reverso (Caddy/Nginx) na frente para HTTPS e domínio próprio.

---

## Depois do deploy (qualquer opção)

1. Entre com `admin@fortgrow.com.br` / `admin123` e **troque a senha imediatamente**
   (ou edite o seed antes de rodá-lo para já criar suas credenciais).
2. Agende as automações: `npm run automations:run` em um cron diário
   (Render: *Cron Job*; Vercel: *Vercel Cron* chamando `POST /api/automations/run`).
3. Configure as integrações no `.env` conforme for conectando as plataformas.
