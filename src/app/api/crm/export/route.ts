import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrm, isCrmError } from "@/lib/crm-tenant";
import { leadWhere } from "@/lib/crm-repo";
import { tablePdf } from "@/lib/pdf";

/**
 * Exportação dos leads em CSV, Excel ou PDF.
 *
 * Respeita os mesmos filtros da tela: o que está na lista é o que sai no
 * arquivo. Roda no servidor para não expor ao navegador nada além do que
 * aquela empresa já pode ver.
 */

export const dynamic = "force-dynamic";

const COLUNAS = [
  "Nome", "Empresa", "Cargo", "E-mail", "Telefone", "WhatsApp", "Cidade", "UF",
  "Origem", "Etapa", "Responsável", "Valor estimado", "Valor fechado",
  "Score", "Temperatura", "Etiquetas", "Criado em", "Último contato", "Próximo contato", "Observações",
];

/** Larguras em pontos para o PDF (soma ≈ 778 = A4 paisagem menos margens). */
const LARGURAS = [78, 78, 52, 96, 62, 62, 56, 22, 56, 62, 62, 52, 40];

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ctx = await requireCrm(p.get("clientId"));
  if (isCrmError(ctx)) return ctx;

  const formato = (p.get("format") ?? "csv").toLowerCase();

  const leads = await prisma.crmLead.findMany({
    where: leadWhere(ctx, {
      q: p.get("q") ?? undefined,
      stageId: p.get("stageId") ?? undefined,
      ownerId: p.get("ownerId") ?? undefined,
      source: p.get("source") ?? undefined,
      state: p.get("state") ?? undefined,
      tagId: p.get("tagId") ?? undefined,
      temperature: p.get("temperature") ?? undefined,
      from: p.get("from") ?? undefined,
      to: p.get("to") ?? undefined,
    }),
    include: {
      stage: { select: { name: true } },
      owner: { select: { name: true } },
      tags: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20000,
  });

  // No CRM da própria agência não há Client para consultar
  const empresa = ctx.clientId
    ? await prisma.client.findUnique({ where: { id: ctx.clientId }, select: { companyName: true } })
    : { companyName: "FortGrow" };

  const dt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");
  const money = (v: unknown) =>
    Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const linhas = leads.map((l) => [
    l.name,
    l.company ?? "",
    l.jobTitle ?? "",
    l.email ?? "",
    l.phone ?? "",
    l.whatsapp ?? "",
    l.city ?? "",
    l.state ?? "",
    l.source ?? "",
    l.stage.name,
    l.owner?.name ?? "",
    money(l.estimatedValue),
    l.wonValue === null ? "" : money(l.wonValue),
    String(l.score),
    l.temperature,
    l.tags.map((t) => t.name).join(", "),
    dt(l.createdAt),
    dt(l.lastContactAt),
    dt(l.nextContactAt),
    (l.notes ?? "").replace(/\s+/g, " ").slice(0, 500),
  ]);

  const arquivo = `crm-${(empresa?.companyName ?? "leads")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}`;

  if (formato === "xlsx") {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([COLUNAS, ...linhas]);
    ws["!cols"] = COLUNAS.map((c) => ({ wch: Math.max(12, Math.min(38, c.length + 6)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(new Blob([new Uint8Array(buf)]), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${arquivo}.xlsx"`,
      },
    });
  }

  if (formato === "pdf") {
    // O PDF é um resumo impresso: só as colunas que cabem na folha
    const colunas = COLUNAS.slice(0, LARGURAS.length).map((header, i) => ({
      header,
      width: LARGURAS[i],
    }));
    const pdf = tablePdf(
      `CRM — ${empresa?.companyName ?? "Leads"}`,
      `${leads.length} lead(s) · gerado em ${new Date().toLocaleString("pt-BR")}`,
      colunas,
      linhas.map((l) => l.slice(0, LARGURAS.length))
    );
    return new NextResponse(new Blob([pdf]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${arquivo}.pdf"`,
      },
    });
  }

  // CSV com BOM e ";" — é o que o Excel em pt-BR abre sem pedir nada
  const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [COLUNAS, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}.csv"`,
    },
  });
}
