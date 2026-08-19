#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js 20 o superior. Instálelo desde https://nodejs.org"
  exit 1
fi

echo "Instalando dependencias. La primera vez puede tardar unos minutos..."
npm install
echo
echo "Abra en el navegador: http://localhost:5173"
echo "No cierre esta ventana mientras use los validadores."
npm run dev -- --host --port 5173
