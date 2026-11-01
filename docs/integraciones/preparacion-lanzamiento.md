# Diagnóstico de lanzamiento

2026-11-01. Ruta privada /admin/lanzamiento. Base f5ecac6, sin cambios de esquema.

readiness.ts construye un informe a partir de observaciones locales y del entorno.
queries.ts consulta productos, stock activo, cobertura, zonas sin indicaciones y
getCommerceSettings. Solo la página autenticada lo invoca, después de requireAdmin.
La revocación del rol en BD impide una nueva lectura aunque siga existiendo el JWT.

collectLaunchSnapshot ejecuta consultas independientes con allSettled. Un rechazo queda
como null: el estado será desconocido, sin mostrar la excepción. No representa disponibilidad
durante una caída completa de BD: la autenticación sigue fallando de forma cerrada.

Los medios manuales usan los ready resueltos del checkout, que pueden provenir de BD
o del entorno. No se vuelven a interpretar solo los flags de entorno, ni se considera
Izipay un medio del checkout por habilitar su flag. WhatsApp/correo comercial se validan
por formato; no se comprueba su atención o recepción externa.

Publicación reutiliza readSeoConfig: producción, PREVIEW_MODE=false explícito y origen
HTTPS público válido. La configuración no comprueba DNS, TLS ni disponibilidad externa.
No se muestran los valores del entorno. Izipay reutiliza el lector local de sandbox;
correo reutiliza inspectPaymentEmailSetup. Ambos conservan validación externa pendiente.
La bandera de confirmaciones no describe por sí sola el transporte de recuperación de
contraseña: la guía pide comprobar ambos recorridos cuando exista acceso al proveedor.

Estados: Configurado / Pendiente / Requiere validación / No se pudo comprobar.
El progreso tiene denominador fijo de siete comprobaciones automáticas. Los requisitos
locales pendientes incluyen fallos de consulta. Correo comercial es informativo. Los
proveedores y las cinco revisiones de ROSH quedan fuera de esa fracción; 7/7 no significa
autorización de producción. Estas revisiones aún no son editables ni se guardan como aceptadas.

Actualizar comprobaciones es un enlace de documento completo para evitar reutilizar
el resultado del router. Abrir o actualizar el panel solo lee. El mantenimiento ya
existente sigue siendo una acción administrativa explícita que puede liberar reservas.

Los enlaces resuelven configuración editable, consultas o instrucciones internas; las
claves siguen administrándose fuera de formularios. El recorrido con el cliente necesita
un entorno y una cuenta de prueba. Las restauraciones requieren bases aisladas; la copia
JSON comercial no equivale a un dump completo de PostgreSQL.
