# S3-02 — QA de preparación aislada Izipay

Fecha: 2026-10-22 (America/Lima).
Base: `beb8698f0f1c7d599ea840d5a7ead51b29e72b3b`, propuesta PR #16.
No es el cierre de S3-02 ni una verificación del sandbox externo de ROSH.

## Cambio y prueba

Se añaden núcleo Mi Cuenta Web, entrada exclusiva de servidor, variables vacías y
desactivadas, guía y actualización de decisiones/plan. No se incorpora Express,
un SDK de cliente ni un endpoint de pago. No hay nuevas dependencias o migraciones.

Comando local: `node --import tsx --test tests/izipay-preparation.test.ts`.
**15/15 aprobadas**, Node 24.19.0 y npm 11.9.0. Dependencias existentes reutilizadas
en el checkout aislado; no se ejecutó una nueva instalación completa en esta entrega.

`npm run typecheck`, `npm run lint` y `git diff --check` aprobados localmente.
Se conservaron el target TypeScript existente y las dependencias: la conversión usa
el constructor BigInt compatible con el proyecto y la validación acepta datos desconocidos.

| Grupo | Casos comprobados |
| --- | --- |
| Dinero | Céntimos exactos, mínimo, techo de BD; rechazo de float, precisión extra, cero y formatos no canónicos. |
| Snapshot | Referencia/moneda/correo válidos y rechazo de propiedades inesperadas; payload sin tarjeta/CVV. |
| Configuración | Desactivado por defecto; exige familia y modo TEST y credenciales presentes antes de llamar. |
| Transporte | URL fija HTTPS, POST/Basic Auth, no cache y sin redirecciones; respuesta solo token/clave pública. |
| Fallos | HTTP, JSON, contenido/tamaño, error de red y timeout sin segundo intento automático ni filtrado de detalles sensibles. |
| Firma | UTF-8 original, digest hexadecimal, comparación constante; rechazo de alteración, reserialización, otra clave, Base64 y datos inválidos. |

Todos los fetch de pruebas usan una función en memoria; no se usaron credenciales
del proveedor ni se invocó la API de Izipay. Una firma válida no evita replay sin BD.
Las pruebas no demuestran propiedad de una orden, recuperación distribuida ni cobro aprobado.

## Checks y evidencia

Tipo/lint locales aprobados; ejecutar CI de cabecera y registrar su resultado/SHA en el PR de entrega.
La CI canónica usa Node 22.23.3/npm 11.9.0 y PostgreSQL 16. La regresión previa es
117 servidor/66 navegador; los quince casos nuevos se contabilizan aparte hasta
obtener la ejecución de la cabecera completa.

Verificar enlaces relativos, diff, ausencia de cambios en lockfile/migraciones y
conservación de los 192 PNG anteriores. No se generan capturas de interfaz porque no
se modificó UI ni existe un checkout de proveedor implementado en esta entrega.

## Fuentes y pendientes

Fuentes primarias y límites en la [guía técnica](../integraciones/izipay-sandbox.md).
La documentación profunda de Mi Cuenta Web entregó un contenedor sin texto útil;
se revisaron ejemplos oficiales GitHub. No se presume un contrato comercial ni un
payload completo confirmado para ROSH. El flag TEST local no sustituye credenciales de test.

Pendientes: producto/habilitación Yape, credenciales de pruebas, contrato del sandbox,
intentos/eventos persistidos, rutas autenticadas/IPN, verificación de campos de negocio,
estados concurrentes y evidencia externa. El checkout manual permanece como circuito existente.

Render requiere confirmar el workspace antes de operar. Solo se consultó selección y
lista; no se leyeron servicios/BD/secretos ni se reanudó/desplegó infraestructura.

Registro de la entrega inicial. Después el propietario confirmó My Workspace y se
realizó [preflight de solo lectura](../render-free-preview.md#preflight-comprobado-el-2026-10-22-americalima).
El incremento siguiente añade [persistencia aislada](s3-02-intentos.md); no modifica
retroactivamente las verificaciones ni el alcance de este primer núcleo.
