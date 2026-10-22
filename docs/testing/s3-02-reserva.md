# QA — S3-02 reserva automática interna

Fecha: 2026-10-22 (America/Lima). Rama `fase-2/sprint-03-reserva-automatica`, sobre PR #19.
Base `8424493ebdf099b029c9d066ab50869125ccdaf6`: CI 39808132000 aprobada,
165/165 servidor y 68/68 navegador, 13 migraciones, seis contratos SQL y restore del carrito.
Los resultados de la nueva cabecera y su SHA se registran en el PR al terminar CI.
El resultado esperado no se presenta como una ejecución aprobada.

## Cobertura añadida

- Cinco casos deterministas: DTO estricto, normalización/factura, huella ligada a
  cuenta/cotización/campos y separación entre métodos; cambio de cuenta antes de BD.
- Doce casos PostgreSQL: importe/envío congelados y sin pago inventado; seis envíos
  paralelos; replay con carrito posterior/configuración desactivada; cambio de método;
  cuenta/clave ajena; última botella entre manual y automático; tarifa cambiada;
  límite mixto de pendientes; rollback tras descontar stock; vencimiento/mantenimiento
  repetido; marcador histórico ausente; configuración desactivada o modo incorrecto.
- Los nueve casos de intentos y ocho de inicio existentes usan ahora reservas
  automáticas reales del servicio. Ningún fixture positivo borra un pago manual.
- Contrato SQL de migración 14: NULL histórico y datos previos conservados, valor
  desconocido rechazado y marcador explícito permitido. Séptimo contrato SQL acumulado.
- Dump/restore nativo separado de orden + intento INITIATING; replays preservan
  identidades y no conceden otra llamada externa. Sin token en dump ni contacto a Izipay.
  Se conserva además el contrato de recuperación del carrito, ahora con 14 migraciones.

## Verificación y procedencia

Local: Node 24.19.0/npm 11.9.0, cliente Prisma generado sin engine; tipos, lint y 40
casos deterministas seleccionados aprobados. Esta ejecución no prueba PostgreSQL
ni reemplaza la toolchain canónica de CI, Node 22.23.3/npm 11.9.0/PostgreSQL 16.
CI debe comprobar la cabecera con 182 casos de servidor previstos, 68 de navegador,
14 migraciones, siete contratos SQL, dos contratos de restore, Prisma/tipos/lint/build
y auditoría de dependencias de producción. El PR conserva el resultado observado.

Comandos relevantes:

```bash
node --import tsx --test tests/automatic-order.test.ts tests/checkout-idempotency.test.ts tests/izipay-initiation.test.ts tests/izipay-preparation.test.ts
npm run typecheck
npm run lint
npm test
# Solo dentro de CI aislada con POSTGRES_CONTAINER y vinos_rosh_ci:
node scripts/verify-cart-restore.mjs
node scripts/verify-cart-restore.mjs automatic
```

Los tests de integración exigen `vinos_rosh_ci` o `vinos_rosh_test`; las bases temporales
de restore tienen guardas CI/loopback/nombre específico y se eliminan al finalizar.
Configuración y datos son sintéticos. Las pruebas de token usan transporte simulado,
no sandbox externo. Los dumps temporales no se publican como artefactos.

## Corrección de dependencia detectada por CI

[CI 39847337080](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39847337080)
se detuvo en `npm audit --omit=dev --audit-level=high`, antes de Prisma/tests. El feed
reportó Next.js 16.3.8 como dependencia afectada crítica; la auditoría de producción
agrupó tres avisos en ese paquete. El baseline anterior había aprobado con el feed
entonces disponible; eso no garantiza ausencia de vulnerabilidades publicadas después.

Se fijan `next` y `eslint-config-next` 16.4.2 y se regenera el lockfile con npm 11.9.0,
sin `audit fix --force` ni omitir controles. Los avisos de RCE consultados indican
corrección desde 16.4.1; 16.4.2 es la versión estable ofrecida por el registro y verificada
con sus notas oficiales. Node 22/React 19 satisfacen sus peers. Se repiten todos los
checks sobre la cabecera actualizada; los resultados se registran en la PR.
Localmente, tipos/lint y los 40 casos seleccionados vuelven a aprobar tras la actualización.
`npm audit --omit=dev` devuelve **0 hallazgos**. La auditoría completa sigue reportando
**cinco entradas high** originadas en una dependencia de lint: plugin Next → fast-glob →
micromatch → braces 3.0.3. El aviso es [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
sin versión corregida publicada en el registro consultado. Se registra seguimiento
antes de producción; los patrones de lint proceden del repositorio, no del checkout.
No se baja Next a 14 ni se fuerza una major transitiva para silenciar el reporte.
No se reproduce ningún exploit ni se afirma que la tienda haya sido comprometida.

Fuentes primarias verificadas el 2026-10-22:
[aviso SVG](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw),
[aviso de caché](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr),
[aviso de Server Actions reportado por npm](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) y
[release 16.4.2](https://github.com/vercel/next.js/releases/tag/v16.4.2).

## Evidencia visual y límites

No hay interfaz nueva; se conservan sin cambios los 192 PNG históricos. La regresión
Playwright del recorrido existente y la ruta de inicio desactivada genera artefactos
en CI. No se crean capturas que aparenten un pago Izipay.

El plazo de 15 minutos es una política provisional local de stock. No prueba duración
del token ni tratamiento de una IPN tardía. SDK/retorno, consulta, webhook, activación
comercial, claves de test y prueba externa siguen pendientes. Tampoco se valida UAT,
emisión fiscal o un respaldo real de Render. No se despliega ni migra su base remota.

[Contrato](../integraciones/reserva-izipay.md) · [ADR](../decisions/0010-reserva-automatica-sandbox.md) ·
[Plan](../sprints/fase-2-sprint-03.md).
