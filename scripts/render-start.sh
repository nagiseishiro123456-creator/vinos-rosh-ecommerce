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

if [[ "${BOOTSTRAP_BUSINESS_DATA:-false}" == "true" ]]; then
  echo "Cargando catálogo, zonas y configuración comercial inicial..."
  node scripts/bootstrap-business-data.mjs
fi

echo "Preparando salida standalone de Next.js..."
mkdir -p .next/standalone/.next

if [[ -d public ]]; then
  rm -rf .next/standalone/public
  cp -R public .next/standalone/public
fi

rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static

echo "Iniciando Vinos ROSH en Render..."
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-10000}"
exec node .next/standalone/server.js
