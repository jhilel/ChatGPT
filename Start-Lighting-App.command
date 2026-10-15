#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22.12 or later from nodejs.org, then open this launcher again."
  read -r lighting_reply
  exit 1
fi
echo "Lighting App 2 will print its local address below. Open it in your browser."
echo "Leave this window open while using AI. Press Control-C to stop."
exec node server.mjs
