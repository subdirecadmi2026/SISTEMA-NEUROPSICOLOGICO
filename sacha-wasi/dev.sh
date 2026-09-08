#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/backend"
if [[ ! -f .env ]]; then
  cp .env.example .env
  php artisan key:generate --force
fi
if [[ ! -f database/database.sqlite ]]; then
  mkdir -p database
  touch database/database.sqlite
  php artisan migrate:fresh --seed --force
fi

php artisan serve --host=0.0.0.0 --port=8000 &
API_PID=$!

cd "$ROOT/frontend"
if [[ ! -d node_modules ]]; then
  npm install
fi
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Sacha Wasi listo:"
echo "  App  http://localhost:5173"
echo "  API  http://localhost:8000"
echo "  Demo admin@sachawasi.ec / password"
wait
