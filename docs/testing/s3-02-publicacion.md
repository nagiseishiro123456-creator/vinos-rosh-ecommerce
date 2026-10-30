# S3-02 — Publicación del avance con cuenta colaboradora

2026-10-25, America/Lima. Base: `715327c289853fb688c101e825f68f9ed57fe99b`.
Rama prevista: `codex/sprint-03-reserva-estado`.

El propietario autoriza crear y subir el commit con `jose-israel`. La conexión Personal
devuelve ese login; el repositorio original informa push=true y permiso de colaborador write.
La publicación usa esa conexión explícita, sin cambiar el repositorio de destino.

## Alcance seleccionado

Reserva HTTP autenticada, consulta del pedido automático propio, panel de estado,
recorrido de desarrollo, fotografía necesaria para ese recorrido, pruebas y documentación.
Se conserva la base previa de preparación del Sprint 3. Los cambios posteriores de Home,
carrito y registro no se incluyen y continúan disponibles en la carpeta del propietario.
El fragmento de backlog sobre Home tampoco se incluye para evitar enlaces a archivos ausentes.

## Validación del contenido

Snapshot de Git seleccionado `a9e930fe1e96e0350a7ff3341400267ed4d4493a` exportado a una
carpeta temporal. Servidor: **237/237 aprobadas**, PostgreSQL local vinos_rosh_test,
14 migraciones existentes sin pendientes, sin reset/seed ni cambio de BD de desarrollo.
TypeScript y ESLint aprobaron en esa misma copia. La documentación de publicación y
la normalización de espacios finales de logs se añaden después; no cambian el código probado.
La cifra histórica 238 corresponde al árbol local completo, con una prueba adicional de registro.

Node 24.22.1 local; el proyecto/CI declara Node 22. La instalación compartida local tenía
Next 16.3.8 aunque package/lock declaran 16.4.2. No se modifica la instalación del propietario.
El build temporal con Turbopack rechazó la junction a dependencias fuera de su raíz; el
intento con Webpack rechazó rutas entre C: y E:. Ninguno constituye un build aprobado.
Se hizo npm ci aislado (423 paquetes); la generación de Prisma en esa instalación limpia
requirió una autorización que fue rechazada. Se detuvo esa operación. La compilación con
las versiones fijadas y la regresión de navegador completas quedan pendientes de CI.

Los logs históricos conservan su contenido; se normalizan solo espacios finales y EOF
para que el diff preparado no introduzca errores de whitespace. Las capturas JPG y sus
hashes se mantienen intactos. No se incluye `.env`, node_modules, temporales o credenciales.

La rama será una entrega revisable: no cierra S3-02, no acredita sandbox externo/IPN/correo,
no activa los flags y utiliza `[skip render]`. La integración en main requiere revisar CI
y el alcance previo aún no integrado; no se realiza una fusión en esta publicación.
