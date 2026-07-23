import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff, isResponse } from "@/lib/api-guard";
import { SDR_SYSTEM_PROMPT } from "@/lib/ai/sdr-prompt";

export const dynamic = "force-dynamic";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(40),
});

/** Conversa com o SDR IA — assistente de prospecção da FortGrow. */
export async function POST(req: NextRequest) {
  const session = await requireStaff("prospeccao", "view");
  if (isResponse(session)) return session;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SDR IA indisponível: configure a variável OPENAI_API_KEY no servidor para ativar o assistente." },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1600,
        temperature: 0.7,
        messages: [{ role: "system", content: SDR_SYSTEM_PROMPT }, ...parsed.data.messages],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "O provedor de IA retornou um erro — tente novamente." }, { status: 502 });
    }
    const json = await res.json();
    const reply: string | undefined = json.choices?.[0]?.message?.content;
    if (!reply) return NextResponse.json({ error: "Resposta vazia do provedor de IA." }, { status: 502 });

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Não foi possível falar com a IA — confira a conexão e tente de novo." }, { status: 502 });
  }
}
