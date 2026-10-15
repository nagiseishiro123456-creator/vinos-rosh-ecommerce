# ADR 0001 — Dependencias y evidencias reproducibles

- Fecha: 2026-10-15. Estado: adoptada en la rama S1-01.
- Contexto: main no versiona lockfile, usa npm install en distintos arranques y no tiene captura visual automatizada.

## Decisión
Versionar `package-lock.json`, Node 22.23.3 y npm 11.9.0.
Usar `npm ci --include=dev` para instalaciones ordinarias. `npm install` se reserva
para cambios deliberados de dependencias y del lockfile en PR.
Mantener Next.js, React, Prisma y el modelo comercial sin migraciones en S1-01.
Agregar Playwright como herramienta de QA de desarrollo para comprobar la app
compilada y generar imágenes en escritorio/móvil; no se envía al navegador del cliente.

## Alternativas
- Continuar resolviendo rangos en cada despliegue: menos cambios hoy, pero resultados variables.
- Capturas manuales sin script: útiles, pero difíciles de repetir con los mismos datos.
- Renovar todas las dependencias: amplía el riesgo y confunde baseline con una migración.

## Consecuencias
CI requiere Chromium y más tiempo; se ejecuta en runner estándar de repositorio público.
Los artefactos de CI se conservan 14 días y las capturas elegidas deben copiarse a
`docs/evidencias/` en una entrega posterior para conservación junto a Git.
Fixture limitada explícitamente a `vinos_rosh_ci`/`vinos_rosh_test`, con activación
`SMOKE_TEST_DATA=true`. Nunca se usa contra la BD de Render.
Una actualización de Node/npm/dependencias debe modificar estos archivos y volver a verificarse.
No se contratan servicios ni se activan pagos. Se respeta `docs/cost-policy.md`.
