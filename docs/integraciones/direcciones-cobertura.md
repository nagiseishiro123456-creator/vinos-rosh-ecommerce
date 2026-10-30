# Contrato de direcciones y cobertura

2026-10-30. Incremento del Sprint 4; sin nuevas tablas, columnas ni servicios externos.

## Identidad y precio

coverage.ts comparte en navegador/servidor la identidad de departamento, provincia y
distrito: Unicode NFD, marcas diacríticas, espacios y minúsculas. No asigna coordenadas
ni certifica un distrito oficial. Los nombres y tarifas siguen siendo administrados por
ROSH. Se conserva su escritura almacenada, sin reescribir direcciones ni pedidos.

Una coincidencia activa devuelve tarifa; ninguna, sin cobertura; varias, ambigua. No se
elige la primera ni la más barata. /envios y los formularios excluyen grupos ambiguos;
administración los señala para revisión. El checkout usa la misma función y vuelve a
validar antes de reservar. Su quote existente incluye identidad, tarifa y dirección;
cambios posteriores requieren revisar el resumen y las reservas previas no se alteran.

La consulta pública solo serializa nombres, identificadores y precios canónicos en PEN.
Busca localmente sin transmitir una dirección ni pedir ubicación. Muestra 24 resultados
con ampliación explícita. El ejemplo /desarrollo/envios tiene rótulo ficticio, noindex y
404 fuera de development; sus importes no representan tarifas comerciales.

## Operación de tarifas

Nuevas zonas se comparan también con las pausadas para evitar duplicados normalizados.
Edición por ID con updatedAt esperado; conserva identidad textual y activación. Para
otra ubicación se crea otra zona. Pausa/activación reciben el estado y timestamp vistos;
un replay no invierte el nuevo estado. El timestamp avanza al menos 1 ms por mutación.

Se serializan las escrituras de esta pequeña tabla operativa mediante advisory lock
transaccional 82203401; se verifica ADMIN actual después de adquirirlo. No sustituye
una restricción normalizada para escrituras SQL externas: datos heredados ambiguos se
detectan y bloquean en la lectura. Se puede pausar una fila conflictiva para resolverla.
Una activación no puede introducir otra tarifa activa equivalente.

Precio decimal exacto entre 0.00 y 10000.00; cero explícito es envío sin costo. La acción
limita 20 guardados por administrador/minuto. Formularios conservan campos y muestran
errores de importe, duplicado o conflicto. No se carga ninguna tarifa comercial nueva.

## Direcciones

Todas las mutaciones bloquean primero la fila User y verifican propiedad/actividad
dentro de la transacción. Crear, editar, elegir principal y archivar se serializan por
cuenta; se repara de forma determinista cualquier selección principal duplicada previa.
Una dirección activa permanece principal mientras existan activas; al archivar se elige
una superviviente. No se borra la dirección referenciada por pedidos históricos.

Hasta diez activas por cuenta, comprobadas dentro de la transacción. Cuenta con legado
superior al límite puede editar/quitar. Celular peruano de nueve dígitos comenzando en 9,
con +51 opcional normalizado; se explica la corrección en su campo. Solo se guardan
zonas activas no ambiguas. Datos normalizados de zona provienen de BD, no del cliente.
Editar una principal la conserva; para cambiarla se selecciona otra desde la lista.

El formulario se comparte entre checkout, alta y edición de cuenta. Los valores son
controlados para conservarlos ante error. Las acciones de guardado tienen presupuesto
de 20 por cuenta/minuto. Precios y dirección final siempre se revalidan en servidor.
No modifica stock, pagos ni snapshots de pedidos existentes.
