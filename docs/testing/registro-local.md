# QA — Registro y desbloqueo local

Fecha: 2026-10-22 (America/Lima). Rama `fase-2/correccion-registro-local`, sobre PR #20.
Base validada: `f254a839b5e65b292d431a300d74db4b0243991f`, CI 39848363578,
182/182 servidor y 68/68 navegador. No se accede al equipo ni BD del propietario.

## Cobertura del cambio

- Nueve casos de política: regla normal, opt-in local acotado y namespace separado,
  producción bloqueada para la relajación, hosts/BD/URLs inválidos o remotos,
  loopback IPv4/IPv6, modos test/indefinido y cálculo del tiempo de espera.
- Tres casos PostgreSQL: borrado selectivo sin tocar cuentas/pedidos u otros límites;
  bucket antiguo lleno frente a namespace local y recuperación; guardas de producción,
  host remoto e IP inválida sin borrar el comprobante. Solo BD vinos_rosh_ci/test.
- Dos casos Playwright en desktop/mobile/small-mobile/tablet: contraseña inválida
  rechazada por el navegador sin enviar la solicitud; límite real de seis peticiones
  y siguiente 429 con texto/tiempo/cabecera coherentes, sin crear cuenta. Sin overflow.
  Dos capturas por tamaño (ocho nuevas) mediante el helper existente.
- La limpieza del test anterior de rate limiting se limita ahora a su propia clave,
  en vez de borrar todos los buckets. La identidad SHA-256 no cambia.

Se esperan **194 casos de servidor y 76 de navegador**. El resultado observado y el
SHA exacto se registran en la PR después de CI. No se atribuyen resultados futuros
a una ejecución ya aprobada. Local: tipos/lint y tests deterministas; integración
completa en Node 22.23.3/npm 11.9.0/PostgreSQL 16 de GitHub Actions.
El entorno de edición usa Node 24.19.0/npm 11.9.0 y Prisma sin engine de BD.

Se mantienen 14 migraciones, siete contratos SQL y los dos contratos de dump/restore
del baseline. No hay cambios de schema, lockfile ni dependencias. Auditoría de producción
conservada; el aviso transitivo de braces en lint continúa registrado en el backlog.

## Evidencia y límites

Las ocho capturas originales se cargan con el reporte smoke en el artefacto de CI,
retenido 14 días. El job Registration evidence exporta bytes y procedencia para inspección,
sin recrear las imágenes. Los 192 PNG versionados anteriores permanecen intactos.
Se usan correo/contraseña/IP sintéticos y no se muestran contraseñas en texto plano.

La prueba del modo local usa política y almacenamiento reales con configuración de QA.
El smoke se ejecuta contra build production y comprueba que sigue el cupo normal;
no habilita un bypass en una preview. El script PowerShell se revisa estáticamente;
no se afirma haber ejecutado la instalación Windows del propietario ni desbloqueado su BD.

[Operación y pasos](../desarrollo-registro-local.md) · [Avance](../progreso.md).
