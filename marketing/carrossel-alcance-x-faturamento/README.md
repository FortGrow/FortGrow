# Carrossel — "Milhões de usuários. Isso não paga boletos."

Carrossel de 5 slides (Instagram, 1080×1440 / 3:4) seguindo a identidade visual
FortGrow: fundo navy escuro com brilhos azuis, tipografia condensada em caixa
alta (Anton) para títulos, Montserrat no corpo, destaques em azul elétrico e
cards com hairlines — mesma linguagem do carrossel "O Neymar foi convocado".

## Estrutura

| Slide | Conteúdo |
|---|---|
| 1 (capa) | Foto de Mark Zuckerberg à esquerda + "Milhões de usuários. Isso **não paga boletos.**" |
| 2 | Curtidas não são faturamento — leads, reuniões, vendas |
| 3 | O problema não é a falta de alcance — atenção VS clientes |
| 4 | Antes do conteúdo, vem a estratégia — checklist |
| 5 (encerramento) | Você quer mais visualizações… ou mais clientes? + assinatura FortGrow |

## Arquivos

- `slide-1.html` … `slide-5.html` — arte de cada slide (editável em HTML/CSS)
- `styles.css` — sistema visual compartilhado (cores, tipografia, cards)
- `assets/` — fontes (Google Fonts, baixadas localmente), logo e foto
- `export/` — PNGs finais em 1080×1440, prontos para publicação
- `render.sh` — regenera os PNGs após qualquer edição nos HTMLs

## Como regenerar os PNGs

```bash
./render.sh            # usa o headless_shell do Playwright
CHROME=/caminho/chrome ./render.sh   # ou aponte para outro Chromium
```

## Créditos e licenças

- **Foto do slide 1:** Anthony Quintano, "Mark Zuckerberg F8 2019 Keynote",
  via Wikimedia Commons, licença **CC BY 2.0** — a atribuição impressa no
  rodapé do slide é exigida pela licença e não deve ser removida.
  A imagem é usada apenas como elemento visual de curiosidade, sem qualquer
  crítica, acusação ou afirmação sobre a pessoa retratada.
- **Fontes:** Anton e Montserrat (SIL Open Font License, via Google Fonts).
