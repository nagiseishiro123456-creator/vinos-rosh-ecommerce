# Instalación y verificación reproducible

## Herramientas
Node 22.23.3 (`.nvmrc`), npm 11.9.0, PostgreSQL 16 y Git.
Para Docker local, Docker Desktop/Compose. Para capturas, Chromium de Playwright.
El lockfile fija las dependencias; no se incluye `.env` en Git.

## Windows
Con Node/npm fijados y Docker disponible, ejecutar `npm run setup:dev`.
El script conserva `.env` existente; si no existe genera secretos solo locales.
Ahora detiene la preparación ante errores de comandos nativos, usa `npm ci` y aplica
migraciones versionadas con `prisma migrate deploy` sin generar migraciones nuevas.
El script PowerShell se revisó estáticamente; requiere comprobación en Windows.

## Linux/macOS y pasos explícitos
1. Seleccionar Node con `nvm use` (si se usa nvm) y verificar `node --version`.
2. Instalar npm fijado: `npm install --global npm@11.9.0`.
3. Copiar `.env.example` a `.env`. Sustituir contraseña de BD, `NEXTAUTH_SECRET` y
   contraseña inicial de admin con valores locales aleatorios; mantener pagos externos desactivados.
4. `npm ci --include=dev`.
5. `npm run db:up` y esperar un estado healthy de PostgreSQL.
6. `npx prisma validate` y `npm run prisma:generate`.
7. `npx prisma migrate deploy` y `npm run db:seed`.
8. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
9. `npm run dev` para desarrollo. `/api/health` debe devolver 200 y `database: connected`.

`prisma migrate dev` se reserva para crear nuevas migraciones deliberadamente;
`migrate deploy` reproduce las ya versionadas. No usar reset ni borrar volúmenes con datos que se necesiten.
Las pruebas de integración crean/modifican datos y ejecutan mantenimiento: usar SIEMPRE una
base aislada, nunca una BD con clientes ni la del preview compartido.

## Smoke visual con BD aislada
Preparar una BD vacía llamada `vinos_rosh_test` (o `vinos_rosh_ci` en CI).
Configurar `DATABASE_URL` y URLs de aplicación/auth en un `.env` solo de pruebas;
usar `NEXTAUTH_URL=http://127.0.0.1:3000`, `PREVIEW_MODE=true`, `SHOW_DEMO_CATALOG=false`,
pagos desactivados y `SMOKE_TEST_DATA=true`. Las variables de proceso prevalecen sobre `.env`.

```sh
npm ci --include=dev
npm run prisma:generate
npx prisma migrate deploy
npm test
npm run db:seed:smoke
npm run build
npm run prepare:standalone
npx playwright install chromium
npm run test:smoke
```

Para Playwright, exportar las variables del `.env` a la sesión o ejecutar su CLI con
`node --env-file=.env node_modules/@playwright/test/cli.js test`.
En Linux puede hacer falta `npx playwright install --with-deps chromium`.
El smoke inicia el servidor standalone por sí mismo y exige health 200 con conexión real.
Genera Home, catálogo, producto ficticio y acceso en 1440×1000 y 390×844.
Salidas: `test-results/` y `playwright-report/` (temporales, ignoradas por Git).
Para conservar capturas seleccionadas, copiarlas a `docs/evidencias/sprint-01/`
con un índice que identifique origen, datos, revisión y límites.

## CI y límites
CI usa un PostgreSQL 16 temporal, aplica migraciones y seed, ejecuta auditoría, tests,
tipos, lint, build y smoke; publica evidencia durante 14 días.
No se ejecuta contra Render ni modifica su configuración activa.
Dockerfile y Blueprint actualizados representan configuración propuesta; no equivalen
a una imagen Docker construida ni a un despliegue de Render verificado.
La base de trabajo no puede iniciar PostgreSQL convencional: CI aporta la validación de BD.
