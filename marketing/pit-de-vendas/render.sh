#!/usr/bin/env bash
# Renderiza os 5 slides do pit de vendas em PNG (1080x1440).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/export"
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"

mkdir -p "$OUT"

for i in 1 2 3 4 5; do
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 \
    --window-size=1080,1440 \
    --screenshot="$OUT/pit-$i.png" \
    "file://$DIR/pit-$i.html" 2>/dev/null
  echo "ok: export/pit-$i.png"
done
