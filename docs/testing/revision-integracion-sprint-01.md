# Revisión e integración — Sprint 1

Fecha: 2026-10-16 (America/Lima). Revisión iniciada sobre
`e26be3909a3aa1a15bd2228bb2625384ae41559f`. Continuación, corrección e integración:
2026-10-17 (America/Lima). Estado: RI-01/RI-02 corregidos; PR #3–#7 integrados.
La validación de main detectó RI-03 de aislamiento de la suite, corregido en el cierre.

## Revisión del incremento

Se revisaron cálculo Decimal/cadenas/céntimos; firma y clave por cliente; transacción
Serializable y reserva condicional; consumo de líneas del carrito; recuperación de reintentos;
cancelación/vencimiento y revisión/reembolso/conciliación; permisos y validación servidor;
migraciones 8–10, backfill/constraints; empaquetado standalone, instalación y flujo CI.
Las cinco cabeceras de PR #3–#7 tienen comprobación validate aprobada. La entrega S1-05
comprobó originalmente 66 pruebas y 14 casos de navegador. Tras las correcciones,
el candidato comprueba 67 pruebas y 16 casos. No se identifican otros defectos que
bloqueen la integración del alcance revisado; esto no garantiza ausencia absoluta de fallos.

## Hallazgo RI-01 — Rol administrativo revocado en rutas heredadas

Severidad: alta. La sesión JWT conserva ADMIN hasta su renovación. Los servicios de
pago revisan el rol vigente, pero el detalle público de pedido, envíos (página/acciones)
y exportación de respaldos aún confiaban en la sesión. Una cuenta degradada podía
conservar acceso administrativo por esas rutas. La barra de administración también lo mostraba.

Corrección implementada y verificada: comprobación compartida contra el rol actual en BD, reusada por
las entradas heredadas. Pedido ajeno devuelve 404 al retirar ADMIN; API de backup 403;
envíos y sus acciones redirigen a la cuenta. No basta con proteger un layout de Next.
Prueba de regresión: mantener la misma sesión abierta, retirar el rol en una BD QA,
intentar leer datos y reenviar un payload válido de envíos; comprobar ausencia de mutación.
Se comprueba además que el JWT sigue indicando ADMIN: el rechazo depende del estado
actual de BD, sin cerrar sesión ni esperar su expiración. El dueño conserva acceso a su pedido.
CI 39095406481 aprobó la regresión en escritorio y móvil; volvió a pasar con RI-02 en
[CI 39095704639](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39095704639).

## Hallazgo RI-02 — Nuevos registros ausentes del respaldo comercial

Severidad: media. El exportador comercial conserva las tablas de Fase 1, pero omite
OrderEvent y PaymentReconciliation agregadas en S1-05. Un JSON descargado no conservaría
el historial ni el importe/referencia de devolución de una conciliación.
Se completó el formato (versión 2, arrays aditivos), con una transacción de lectura
RepeatableRead para obtener un snapshot consistente de las tablas, sin incluir contraseñas
ni tokens. Prueba aprobada: caso cancelado, ingreso conciliado/devolución e historial
presentes en la exportación, sin credenciales. Sigue siendo un exportador comercial: no sustituye pg_dump
ni incorpora un restaurador automático de JSON.

## Render observado antes de integrar

Espacio confirmado por el usuario: My Workspace. Servicio de este repositorio
`srv-db37kj0m7kps73daveug`, web Free, rama main, autoDeploy yes / checksPass;
suspendido por el usuario. PostgreSQL Free `dpg-db37k8om7kps73dauoo0-a`: suspendido.
Último despliegue registrado: `b4831eab1eaf7c3486b4bf8643001edefb5decc2` (Fase 1).
No se reanuda ni cambia Render ni se consulta/modifica su contenido comercial.

Las fusiones y el cierre documental llevarán `[skip render]`, mecanismo oficial para
omitir autodespliegues sin omitir la CI de GitHub:
https://render.com/docs/deploys#skipping-an-auto-deploy.
El build real conserva `npm install`; difiere del Blueprint/CI reproducible. Antes de
reactivar el preview, sincronizar Node/npm/build, respaldar/verificar la BD y revisar
las migraciones pendientes. La integración de Git no demuestra un despliegue funcional.

## Hallazgo RI-03 — Interferencia entre archivos de integración en la BD QA

La primera CI de main, 39096006029, falló (66/67): la preparación del caso de
reembolso duplicado recibió `ManualOrderError: BUSY` al agotar tres reintentos de
reserva Serializable. El log registra conflictos con escrituras de otros escenarios;
el fallo ocurrió antes de probar el reembolso. Los archivos se ejecutaban en paralelo
sobre las mismas tablas pequeñas; uno instala además un trigger temporal de fallos.
Los identificadores únicos no aíslan todos los conflictos de predicados de PostgreSQL.

Corrección: `npm test` usa `--test-concurrency=1` entre archivos. Se conservan todas
las carreras explícitas dentro de cada test, las aserciones y los límites de reintento
del código de producción. No se añaden reintentos al runner para ocultar fallos.
La ejecución paralela futura exige BD/esquema por proceso. Esta suite comprueba
integridad de escenarios concurrentes; no mide capacidad bajo carga sostenida.

## Secuencia de integración

Conservar historia mediante merge commits (sin squash/rebase de las ramas apiladas).
Después de cada base se cambió el destino del siguiente PR a main y se verificaron
cabecera, checks y árbol resultante. Cada árbol fusionado coincide exactamente con
el árbol de la cabecera validada; no hubo conflictos ni cambios de contenido al integrar.

| PR / historia | Cabecera validada | Commit de fusión en main |
| --- | --- | --- |
| #3 / S1-01 | `5c4c59e1b3806f4a131edbf74c4e8e4a62c17b17` | `8b3d128b2a3a6925f460c6e55325b70fc8d595ee` |
| #4 / S1-02 | `e8b72d8f41b36eec6d3317e127e531affe4309d5` | `c6fb849a23998513e6c7be9fd308116ac647f398` |
| #5 / S1-03 | `b35a57896ba06eb35402f5b4d404f3233846df95` | `2391804e2e30328a4d1c1984ae7ca2fe9cd33c6b` |
| #6 / S1-04 | `a457caf92fa1038bdaa6a1fc21fd8c96edddc86e` | `40cd3d891c508560d325e15fb37685195de62cf1` |
| #7 / S1-05 + revisión | `db61726caa9cbedd94506745b38c3d4a39e98be0` | `3620f98556a4a9eaf6d4060e5568e345d74a489f` |

Árbol final del incremento: `2779a5dfcca0695f67d69319168bebdd8c5f8d59`.
Los runs intermedios de main se cancelaron por la concurrencia del workflow al entrar
la siguiente fusión; no se cuentan como validaciones completas. La comprobación
completa del incremento corresponde al run de main indicado abajo.

## Verificación final y evidencias

Candidato `db61726caa9cbedd94506745b38c3d4a39e98be0`, CI 39095704639 aprobada:
67 pruebas Node, 16 casos Chromium; 10 migraciones y tres contratos SQL sobre
PostgreSQL 16; tipos, lint, build y auditoría de producción (0 hallazgos).
La primera CI de main 39096006029 falló por RI-03, descrito arriba. El cierre incluye
su corrección y debe aprobar la suite completa antes de integrarse y de cerrar la tarea.

Se conservaron dos capturas originales nuevas y se revisaron ambas:
[evidencias de integración](../evidencias/sprint-01/integracion/README.md).
Muestran el 404 esperado para un pedido ajeno tras revocar ADMIN. La captura no
demuestra el rechazo de la acción: Playwright comprueba además 403 en backup,
redirección en envíos, ausencia de escritura y acceso del dueño. Total: 56 capturas
con manifiestos; las 54 históricas no se sobrescribieron.

Render comprobado después de integrar #3–#7: web y PostgreSQL siguen suspendidos;
último despliegue `dep-db3bbrvlk1mc73a2bli0`, todavía en `b4831eab…` de Fase 1.
No hubo despliegue, reanudación ni migración remota.

## Continuidad

Ver [cierre técnico](../sprints/cierre-sprint-01.md) y [punto de avance](../progreso.md).
Siguiente paso: refinar Sprint 2 con criterios de móvil, teclado, carrito y movimiento
reducido antes de implementar. La aceptación funcional del Product Owner y el
lanzamiento comercial no se dan por realizados por pasar una CI.
