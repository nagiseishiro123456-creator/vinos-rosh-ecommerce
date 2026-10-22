# Desbloquear el registro durante las pruebas locales

Fecha: 2026-10-22 (America/Lima). Corrección solicitada al probar el registro en local.
Base: PR #20, `f254a839b5e65b292d431a300d74db4b0243991f`.

## Qué ocurre

El registro permite seis solicitudes por IP en una ventana de una hora. El cupo se
consume antes de validar los datos, incluso con contraseña inválida o correo existente.
El estado persiste en `RateLimitBucket`; recargar o reiniciar Next.js no lo elimina.
Sin cabeceras de IP se usa `unknown`, que puede agrupar las solicitudes locales.
No se verificó la cabecera ni se accedió a la base del equipo del propietario.

El nuevo mensaje 429 explica que se limitó la creación de cuentas e indica los minutos
restantes, con `retryAfterSeconds` y cabecera `Retry-After` coherentes. El formulario
muestra las reglas de contraseña y valida también mayúscula, minúscula, número y
longitud en el navegador. Un formulario inválido no consume el cupo del servidor;
la API mantiene su validación y su límite para peticiones directas.

## Desbloquear ahora

Desde la carpeta de esta versión del proyecto, con PostgreSQL iniciado y `.env` local:

```powershell
npm run auth:unlock-local
```

El comando elimina solo las claves de `auth-register` y `auth-register-local` para
`unknown` y las IP de loopback habituales. No elimina cuentas, contraseñas, pedidos,
carritos, intentos de pago ni límites de login/recuperación/checkout. No hace truncate.
Si se prueba desde otro equipo de la red local, se puede especificar su IP:

```powershell
npm run auth:unlock-local -- 192.168.1.20
```

Antes de escribir exige URLs de aplicación de loopback, PostgreSQL en loopback,
base `vinos_rosh`, `vinos_rosh_test` o `vinos_rosh_ci`, y NODE_ENV distinto de production.
Rechaza hosts remotos y overrides de host en la URL. No imprime conexión ni credenciales.
El comando no se ejecutó sobre el equipo del propietario ni sobre Render.

## Evitar bloqueos frecuentes al desarrollar

Añadir en el `.env` local existente:

```dotenv
LOCAL_REGISTRATION_TEST_MODE="true"
```

Reiniciar `npm run dev` después de cambiar la variable. Con NODE_ENV=development,
ambas URLs públicas/autenticación locales y la BD local admitida, el registro usa
un cupo separado de **60 solicitudes cada 10 minutos**. Sigue teniendo límite.
Un bucket antiguo de una hora no bloquea este namespace local.

`setup:dev` activa esa opción solo al crear un `.env` nuevo. Conserva los `.env`
existentes, que requieren añadirla explícitamente. `.env.example` la deja en false.
`npm run build`/`npm start`, un host de BD remoto o una URL pública remota conservan
la regla normal de seis por hora, aunque alguien copie el flag de pruebas.
No se cambia login ni recuperación de contraseña. El comando solo desbloquea registro;
una contraseña existente se cambia mediante el flujo correspondiente, no con este script.

## QA y continuidad

[Pruebas y evidencia](testing/registro-local.md). Sin migraciones ni dependencias nuevas.
Es una corrección de desarrollo/UX durante S3-02; no termina esa historia ni activa Izipay.
Se conservan los 192 PNG históricos y se capturan los dos estados nuevos en cuatro tamaños.
