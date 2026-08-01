import { MARK_DATA_URI } from "./mark-data";

/**
 * Marca FortGrow — arte oficial enviada pela agência.
 * Os arquivos em /public/brand são recortes do PNG original (sem redesenho):
 *   mark.png   → monograma FG (fundo transparente)
 *   lockup.png → logo completa (monograma + FORTGROW), para fundos claros
 *
 * O monograma usa a versão EMBUTIDA (data URI): sem requisição de rede, a
 * logo não pisca nem some por falha de carregamento/cache em produção.
 */
/* eslint-disable @next/next/no-img-element */
export function FgMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src={MARK_DATA_URI}
      alt="FortGrow"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/**
 * Wordmark FORTGROW — FORT em cinza, GROW em azul (cores do monograma oficial).
 * `light` deixa a marca toda em branco, para uso sobre fundo azul.
 */
export function FgWordmark({ className, light = false }: { className?: string; light?: boolean }) {
  if (light) {
    return (
      <span className={className}>
        <span className="font-black tracking-tight text-white/85">FORT</span>
        <span className="font-black tracking-tight text-white">GROW</span>
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="font-black tracking-tight text-slate-300">FORT</span>
      <span className="font-black tracking-tight text-[#2d7ef2]">GROW</span>
    </span>
  );
}
