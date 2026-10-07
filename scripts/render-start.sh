#!/usr/bin/env bash
set -euo pipefail

echo "Aplicando migraciones de PostgreSQL..."
npx prisma migrate deploy

if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  echo "Sincronizando administrador inicial..."
  npx prisma db seed
else
  echo "ADMIN_EMAIL / ADMIN_PASSWORD no configurados: se omite seed de administrador."
fi

echo "Iniciando Vinos ROSH en Render..."
exec npm run start -- -H 0.0.0.0 -p "${PORT:-10000}"
