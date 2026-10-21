# S2-06 — Revisión e integración del Sprint 2

Inicio: 2026-10-21 (America/Lima). Historia de cierre: 2 SP previstos.
Estado: **en curso**; el usuario autorizó avanzar tras cerrar S2-05.
Base del incremento: `d9a0e0ea946158ee8735e71706d18ad07d003166` (PR #13).
Main inicial: `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`.

## Objetivo y alcance

Revisar el incremento completo de compra móvil, selección invitada, unión idempotente y
carrito lateral. Conservar dinero exacto, reserva al confirmar, permisos y conciliación
del Sprint 1. Integrar en orden y comprobar main antes de declarar el cierre técnico.
La aceptación comercial/UAT y el lanzamiento de producción siguen siendo hitos posteriores.

## Puntos de partida verificables

| PR | Historia | Cabecera previa a revisión | Base |
| --- | --- | --- | --- |
| #9 | S2-01 | `97042fd95f35f7646f499d2d26498a7b5852cf62` | `main` |
| #10 | S2-02 | `496b8f4314492b153424620c74b63f17b01f6082` | `fase-2/sprint-02-recorrido-base` |
| #11 | S2-03 | `b74c60726c57e2e50c979eec1465937f31cad867` | `fase-2/sprint-02-ux-movil` |
| #12 | S2-04 | `3c7f012fe1e92b63c5b71d5405589c2b6621b09a` | `fase-2/sprint-02-carrito-invitado` |
| #13 | S2-05 | `d9a0e0ea946158ee8735e71706d18ad07d003166` | `fase-2/sprint-02-union-carritos` |

S2-05: CI final [39495141189](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39495141189),
116/116 servidor y 64/64 navegador, 12 migraciones/cinco contratos SQL, tipos/lint/build y
auditoría de producción aprobados. 186 PNG conservados; los resultados son de esas
cabeceras y no se atribuyen anticipadamente a cambios de S2-06.

## Secuencia y documentación

1. Registrar este plan en Git antes de corregir/integrar. Crear rama `fase-2/sprint-02-revision-integracion`
   sobre el incremento; conservar el checkout anterior sin sobrescribir cambios.
2. Revisar diffs y límites: persistencia/union/comandos, acceso a cuentas, SSR/cliente,
   formularios nativos, exportación/respaldo y regresiones del flujo de compra.
3. Registrar cada hallazgo confirmado con causa, corrección, pruebas necesarias y límites.
   No convertir observaciones hipotéticas en bloqueos ni afirmar pruebas no ejecutadas.
4. Ejecutar CI habitual con PostgreSQL 16 y Chromium; corregir fallos reales. Mantener
   los casos existentes y añadir solo regresiones que cubran los defectos encontrados.
5. Conservar capturas originales pertinentes del incremento final y un manifiesto con
   fuente/run/dimensiones/hashes; comparar visualmente con S2-01 y evidencia posterior.
6. Comprobar cabeceras/CI y fusionar #9 → #10 → #11 → #12 → #13, retargetando el
   siguiente PR a main cuando su dependencia esté integrada. Conservar historial con merge.
   Usar SHA esperado y `[skip render]` en cada commit de integración.
7. Incorporar el PR de revisión/correcciones y comprobar el árbol y la CI de main.
   Actualizar cierre, arquitectura/operación si cambian, backlog y progreso con resultados reales.
8. Registrar pendientes y decisiones que se deben refinar antes de iniciar Sprint 3.
   El Product Owner conserva la aceptación funcional; no se simula su aprobación.

## Criterios de cierre

- Regresión del flujo invitado/cuenta, ingreso/registro/unión, edición desde panel,
  entrega, reserva y comunicación de operación; errores/red/sesión y formularios sin JS.
- Dinero/firma/idempotencia/última botella/rollback/privacidad/rol vigente y conciliación.
- Revisar que nuevas entidades o contratos sigan representados en exportación/respaldo.
- Migraciones aditivas y contratos SQL, Prisma, tipos, lint, build y auditoría de producción.
- Teclado/foco/movimiento reducido y geometría a 320/390/768/1440 px; evidencia real.
- PRs integrados en orden y main verificado; hashes/enlaces/documentación coherentes.

## Restricciones de este cierre

Sin acciones, reanudación/configuración ni despliegue en Render; sin BD remota o pagos reales.
No se contratan servicios ni se implementa Sprint 3. Se conserva el seguimiento de avisos
de desarrollo y los límites de navegador/lectores/contraste/zoom/CWV ya documentados.
Los datos de QA son sintéticos y el entorno de pruebas es aislado.

## Hallazgos y resultados

### R2-01 — Recorrido conjunto de las historias

La cobertura previa comprueba unión, panel y comunicación de pago por separado. Se añade
un caso de integración en escritorio/móvil: 2 unidades invitadas + 3 de cuenta = 5;
editar a 4 desde el panel; reservar por S/ 128.10 con envío; añadir 1 unidad para otra
compra y comunicar la operación anterior. Deben quedar pedido/pago en revisión, stock 6,
una sola reserva y la nueva selección de 1 intacta. Se prevén 66 casos totales, sin
atribuir resultados antes de CI. Tres capturas por proyecto documentarán este recorrido.

### R2-02 — Recuperación de identidades persistidas

Se añade un contrato de recuperación PostgreSQL a CI: crear dos BD temporales en el
contenedor QA, aplicar las 12 migraciones a la fuente y generar una unión/comando con
los servicios reales. pg_dump/psql restauran el destino; los mismos identificadores deben
recuperar resultados sin sumar y deben permitir una edición posterior con otra identidad.
Se comprueban cantidades/revisiones/huellas/stock/pedidos; solo se eliminan esas BD QA.
No se añaden migraciones ni se cambia el contrato de compra.

### R2-03 — Alcance del respaldo comercial

La revisión confirma que JSON es una exportación comercial parcial, no una restauración
completa, y que el dump SQL no filtra tablas. Se aclara en la guía que Cart, CartItem,
CartImport y CartMutation deben conservarse mediante respaldo completo; no se amplía
sin necesidad el JSON ni se presentan contraseñas/identidades técnicas como datos de negocio.
Permisos de administrador vigente y exclusión de secretos mantienen sus regresiones.

### Comprobaciones en curso

Sintaxis de los scripts y whitespace comprobados localmente. El entorno local usa Node 24
y no tiene Docker/psql; npm ci se interrumpió al descargar motores Prisma (ECONNRESET).
No se atribuye una instalación local reproducible ni pruebas de BD a ese entorno. CI con
Node 22.23.3/npm 11.9.0/PostgreSQL 16 es la referencia de aceptación. Resultados e integración
se registrarán después de ejecutarlos; los PR #9–#13 todavía no se han fusionado.
