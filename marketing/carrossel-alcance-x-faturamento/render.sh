#!/usr/bin/env bash
# Renderiza os 5 slides do carrossel em PNG (1080x1440).
# Requer Chromium (usa o binário do Playwright se disponível).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/export"
# headless_shell usa o viewport exato (o chromium --headless=new desconta
# a altura da UI do navegador e cortaria a base do slide)
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"

mkdir -p "$OUT"

for i in 1 2 3 4 5; do
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 \
    --window-size=1080,1440 \
    --screenshot="$OUT/slide-$i.png" \
    "file://$DIR/slide-$i.html" 2>/dev/null
  echo "ok: export/slide-$i.png"
done
