import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, isResponse } from "@/lib/api-guard";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => escape(r[h])).join(";"))].join("\n");
}

/** Exportação de relatórios em CSV: /api/reports/leads|clientes|financeiro|tarefas */
export async function GET(_req: NextRequest, { params }: { params: { type: string } }) {
  const session = await requireStaff("relatorios");
  if (isResponse(session)) return session;

  let rows: Record<string, unknown>[] = [];

  switch (params.type) {
    case "leads": {
      const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
      rows = leads.map((l) => ({
        empresa: l.companyName,
        contato: l.contactName,
        email: l.email,
        telefone: l.phone,
        etapa: l.stage,
        origem: l.source,
        potencial: l.potential,
        valor_estimado: Number(l.estimatedValue),
        cidade: l.city,
        estado: l.state,
        criado_em: l.createdAt.toISOString().slice(0, 10),
      }));
      break;
    }
    case "clientes": {
      const clients = await prisma.client.findMany({ orderBy: { companyName: "asc" } });
      rows = clients.map((c) => ({
        empresa: c.companyName,
        plano: c.plan,
        status: c.status,
        valor_mensal: Number(c.monthlyValue),
        inicio_contrato: c.contractStart?.toISOString().slice(0, 10),
        meses_contrato: c.contractMonths,
        segmento: c.segment,
        cidade: c.city,
        estado: c.state,
      }));
      break;
    }
    case "financeiro": {
      const invoices = await prisma.invoice.findMany({ include: { client: true }, orderBy: { dueDate: "desc" } });
      rows = invoices.map((i) => ({
        cliente: i.client.companyName,
        descricao: i.description,
        valor: Number(i.amount),
        vencimento: i.dueDate.toISOString().slice(0, 10),
        pago_em: i.paidAt?.toISOString().slice(0, 10),
        status: i.status,
        metodo: i.method,
      }));
      break;
    }
    case "tarefas": {
      const tasks = await prisma.task.findMany({ include: { assignee: true, project: true }, orderBy: { createdAt: "desc" } });
      rows = tasks.map((t) => ({
        titulo: t.title,
        status: t.status,
        prioridade: t.priority,
        responsavel: t.assignee?.name,
        projeto: t.project?.name,
        prazo: t.dueDate?.toISOString().slice(0, 10),
        tempo_gasto_min: t.timeSpentMin,
      }));
      break;
    }
    default:
      return NextResponse.json({ error: "Relatório desconhecido." }, { status: 404 });
  }

  await prisma.activityLog.create({
    data: { userId: session.sub, action: `report.export.${params.type}` },
  });

  // BOM para abrir corretamente no Excel
  const csv = "﻿" + toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fortgrow-${params.type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
