import { cn } from "@/lib/utils";

/**
 * Barra de carregamento sob um item de menu.
 *
 * Basta o cursor chegar — não precisa clicar — e a barra preenche da
 * esquerda para a direita em 900ms. É o mesmo efeito do menu da página
 * inicial, agora compartilhado com o sistema para que a navegação responda
 * igual dos dois lados.
 *
 * Cresce por `scaleX` em vez de `width`: `width` é propriedade de layout e
 * obrigaria o navegador a recalcular a cada quadro; `transform` roda no
 * compositor. Também responde ao foco por teclado, para quem navega sem
 * mouse ver o mesmo retorno — e some por completo em `prefers-reduced-motion`.
 *
 * O elemento pai precisa ser `group` e ter `position: relative`.
 */
export function LoadBar({
  className,
  tone = "light",
}: {
  className?: string;
  /** `light` = barra branca (fundo azul); `brand` = azul (fundo escuro). */
  tone?: "light" | "brand";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-2.5 bottom-1 h-[2px] origin-left scale-x-0 rounded-full",
        "transition-transform duration-[900ms] ease-out motion-reduce:transition-none",
        "group-hover:scale-x-100 group-focus-visible:scale-x-100",
        tone === "light"
          ? "bg-gradient-to-r from-[#a9cdfb] to-white"
          : "bg-gradient-to-r from-[#2d7ef2] to-[#7fb0f8]",
        className
      )}
    />
  );
}
