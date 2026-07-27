/**
 * Estilo compartilhado das frases de destaque.
 *
 * Mesma "edição" das manchetes da home: itálico branco sobre um bloco do
 * azul da marca. `box-decoration-clone` faz cada linha da frase receber o
 * bloco completo, com as bordas laterais — sem isso, uma frase que quebra
 * em duas linhas fica com o destaque aberto no meio.
 *
 * Vive fora dos componentes para que home e login usem exatamente o mesmo
 * tratamento, sem uma página importar a outra.
 */
export const HIGHLIGHT =
  "box-decoration-clone bg-[#2d7ef2] px-2.5 py-0.5 italic text-white shadow-[0_0_38px_rgba(45,126,242,0.55)]";
