import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Bootstrap de produção — cria o usuário administrador inicial.
 *
 * Segurança: só executa quando NÃO existe nenhum usuário no banco.
 * Depois da primeira inicialização, retorna 403 para sempre.
 * Acesse GET /api/setup no navegador para inicializar.
 */
async function bootstrap() {
  const users = await prisma.user.count();
  if (users > 0) {
    return NextResponse.json(
      { initialized: true, message: "Sistema já inicializado. Faça login normalmente." },
      { status: 403 }
    );
  }

  await prisma.user.create({
    data: {
      name: "Administrador FortGrow",
      email: "admin@fortgrow.com.br",
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "ADMIN",
    },
  });

  // Catálogo base de serviços da agência
  await prisma.service.createMany({
    data: [
      { name: "Gestão de Tráfego", basePrice: 2500 },
      { name: "Social Media", basePrice: 1800 },
      { name: "SEO", basePrice: 2200 },
      { name: "Sites e Landing Pages", basePrice: 4500 },
      { name: "Design", basePrice: 1500 },
      { name: "Consultoria de Marketing", basePrice: 3000 },
      { name: "Automação e CRM", basePrice: 2000 },
      { name: "Produção de Vídeos", basePrice: 2800 },
    ],
    skipDuplicates: true,
  });

  // Automações padrão
  await prisma.automation.createMany({
    data: [
      { name: "Aviso de vencimento de fatura", trigger: "vencimento_fatura", channel: "email", active: true },
      { name: "Alerta de renovação de contrato (30 dias)", trigger: "contrato_renovacao", channel: "email", active: true },
      { name: "Notificar tarefa atrasada", trigger: "tarefa_atrasada", channel: "notificacao", active: true },
    ],
    skipDuplicates: true,
  });

  await prisma.activityLog.create({ data: { action: "system.bootstrap" } });

  return NextResponse.json({
    initialized: true,
    message:
      "Sistema inicializado! Entre com admin@fortgrow.com.br / admin123 e TROQUE A SENHA imediatamente.",
  });
}

export async function GET() {
  return bootstrap();
}

export async function POST() {
  return bootstrap();
}
