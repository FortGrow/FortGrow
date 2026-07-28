#!/usr/bin/env bash
# Gera o PDF A4 da proposta comercial a partir do HTML.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"

"$CHROME" --headless --disable-gpu --no-sandbox \
  --no-pdf-header-footer \
  --print-to-pdf="$DIR/proposta-comercial-fortgrow.pdf" \
  "file://$DIR/proposta.html" 2>/dev/null

echo "ok: proposta-comercial-fortgrow.pdf"
