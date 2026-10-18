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
8. `npm run typecheck`, `npm run lint`, `npm run build`. Para `npm test`, configurar
   primero una BD aislada según la sección siguiente; no usar la BD de desarrollo con pedidos conservados.
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
Desde S1-02 la fixture también crea un cliente `qa-s102@example.com`, una dirección
ficticia y transferencia simulada `QA-NO-TRANSFERIR`, exclusivamente en la BD aislada.
El password de QA es solo de prueba y se puede sobrescribir con `SMOKE_CUSTOMER_PASSWORD`.
No se deben realizar abonos ni utilizar cuentas reales.

El smoke inicia el servidor standalone por sí mismo y exige health 200 con conexión real.
Genera Home, catálogo, producto ficticio y acceso en 1440×1000 y 390×844;
el caso S1-02 también autentica al cliente ficticio y registra carrito, entrega,
confirmación/reserva, revisión del nuevo importe y operación manual simulada.
Desde S1-03 verifica también cancelación, vencimiento y 404 para otro cliente autenticado,
sin cuentas reales. CI ejecuta el SQL de la migración 8 sobre fixtures antiguas en un
esquema temporal y revierte ese esquema para validar el backfill.
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

## Operación de reservas desde S1-03
`MANUAL_PAYMENT_HOLD_MINUTES` aplica solo a nuevas reservas. El vencimiento existente no cambia
al editar la variable. Ejecutar `npm run db:maintenance` o el botón de `/admin/lanzamiento`
para liberar pendientes vencidos; hasta 100 por ejecución. Repetir hasta agotar pendientes
si hubo mucha inactividad. No usar las pruebas como sustituto del mantenimiento operativo.
Un pago ya comunicado en revisión se concilia, no vence automáticamente. Para retomar un
pedido pendiente, abrir su detalle desde Mi cuenta y usar “Continuar al pago del pedido”.
Antes de aplicar la migración en un entorno con datos: respaldo completo y revisión de
pendientes antiguos sin marca de reserva. Nunca inferir su stock ni pagar una orden sin
reserva verificable. La política/migración propuesta no se ha aplicado a Render.
