# QA — indicaciones editables de entrega

2026-10-31, base 78f4c5b. El propietario solicita edición por ROSH de condiciones
todavía no acordadas. Migración 17 aplicada en QA y desarrollo, sin reset/seed ni tarifas nuevas.

294/294 pruebas de servidor y contratos SQL heredados aprobados en vinos_rosh_test.
Ocho casos nuevos: límites/líneas, firma v1 sin texto, cambio o eliminación invalidan
resumen; edición pausada/versión/omisión/borrado; rechazo sin stock consumido; reserva
manual/replay/backup con snapshot; reserva automática sintética y consulta pública activa.
Tipos y ESLint locales aprobados. El cliente de Prisma se regeneró con Node 22.23.3
tras reiniciar únicamente Next.js del proyecto por bloqueo de DLL de Windows.

SQL confirma que la ampliación no inventa texto ni cambia precios, estado o datos
históricos, y que el snapshot permanece independiente. La restauración CI de conciliación
se amplía con texto del pedido distinto de la zona actual; compara las 17 migraciones.

Nuevo Playwright en desktop/móvil: edición real por ADMIN, error con datos conservados,
texto público y checkout, modificación que exige revisar otra vez sin reservar stock,
confirmación y conservación en detalle del comprador/administrador tras una nueva edición.
La compilación, navegador completo y restauración del incremento se validan en su CI
al publicar; la CI #366 de la base no se atribuye al nuevo código.

La demo /desarrollo/envios y sus capturas están rotuladas como ficticias. No cargan
condiciones en la base. La pantalla real se comprobó con su configuración existente.
La aceptación de ROSH y la carga de sus horarios/plazos quedan pendientes. No se acredita
un calendario automático, entrega comercial, prueba externa de pagos o correo.

La CI inicial #368 confirmó el reset nativo del textarea al devolver un error de precio:
el texto se perdía. Se impide ese reset y el formulario nuevo se remonta tras un alta.
Los recorridos esperan el enlace de cancelar edición antes de rellenar, evitando escribir
en el formulario de alta durante la navegación. Se comprueba texto conservado ante error
y campo limpio después de guardar. La CI final se registra en el PR de entrega.
