# Revisión e integración — Sprint 1

Fecha: 2026-10-16 (America/Lima). Revisión iniciada sobre
`e26be3909a3aa1a15bd2228bb2625384ae41559f`. Estado: hallazgo de autorización en corrección;
no integrar hasta comprobar la regresión y la CI del candidato.
Continuación y corrección: 2026-10-17 (America/Lima).

## Revisión del incremento

Se revisaron cálculo Decimal/cadenas/céntimos; firma y clave por cliente; transacción
Serializable y reserva condicional; consumo de líneas del carrito; recuperación de reintentos;
cancelación/vencimiento y revisión/reembolso/conciliación; permisos y validación servidor;
migraciones 8–10, backfill/constraints; empaquetado standalone, instalación y flujo CI.
Las cinco cabeceras de PR #3–#7 tienen comprobación validate aprobada. La entrega S1-05
comprueba 66 pruebas y 14 casos de navegador. No se identifica un cambio adicional de
dinero/stock que bloquee este alcance, sujeto a la corrección de autorización siguiente.

## Hallazgo RI-01 — Rol administrativo revocado en rutas heredadas

Severidad: alta. La sesión JWT conserva ADMIN hasta su renovación. Los servicios de
pago revisan el rol vigente, pero el detalle público de pedido, envíos (página/acciones)
y exportación de respaldos aún confiaban en la sesión. Una cuenta degradada podía
conservar acceso administrativo por esas rutas. La barra de administración también lo mostraba.

Corrección implementada, pendiente de CI: comprobación compartida contra el rol actual en BD, reusada por
las entradas heredadas. Pedido ajeno devuelve 404 al retirar ADMIN; API de backup 403;
envíos y sus acciones redirigen a la cuenta. No basta con proteger un layout de Next.
Prueba de regresión: mantener la misma sesión abierta, retirar el rol en una BD QA,
intentar leer datos y reenviar un payload válido de envíos; comprobar ausencia de mutación.
Se comprueba además que el JWT sigue indicando ADMIN: el rechazo depende del estado
actual de BD, sin cerrar sesión ni esperar su expiración. El dueño conserva acceso a su pedido.

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

## Secuencia de integración

Conservar historia mediante merge commits (sin squash/rebase de las ramas apiladas).
Después de cada base integrada, retargetear el siguiente PR a main y revisar el diff.
Orden: #3 → #4 → #5 → #6 → #7. Comprobar CI de main en el incremento completo y
actualizar este registro con commits, resultado y pendientes para Sprint 2.
