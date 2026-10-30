# Correcciones locales de carrito y registro

Actualización 2026-10-27: se incluyen estas correcciones funcionales y sus regresiones
en el incremento de confirmaciones. Typecheck y lint actuales aprobados; 255 pruebas
de servidor locales aprobadas. La sección siguiente conserva el registro histórico
de la ejecución inicial, incluidos sus límites de generación de Prisma.

2026-10-23, America/Lima. Corrección solicitada por el propietario; sin despliegue.

## Reproducción anterior al cambio

- En localhost:3000, abrir el carrito y pulsar Cerrar: el panel desaparece pero
  permanece el backdrop del diálogo nativo y la página queda bloqueada.
- En registro, escribir un celular de ocho dígitos y salir del campo no muestra
  el error. La pantalla tampoco utiliza los errores por campo de la API.

## Cambios

- El efecto que abre el diálogo también lo cierra y restaura foco, scroll y estilos
  al cerrar/desmontar. Ya no depende del callback de una animación de salida.
  Se conserva la animación de entrada y la preferencia de movimiento reducido.
- Registro reutiliza el esquema del servidor antes del envío, muestra errores junto
  a cada campo, enfoca el primero al enviar y revalida errores al corregirlos.
  Celular explica longitud, formato y prefijo; contraseña enumera las reglas faltantes.
  Se muestran también errores por campo del servidor y correo ya registrado.
- Validar al salir hacia el botón de envío se difiere al submit para evitar que
  los mensajes desplacen el botón durante el clic.

## Verificación realizada

- Navegador local: cierre con botón y Escape, reapertura, devolución del foco y
  navegación posterior a Productos. Celular de ocho dígitos muestra el error;
  corregir a nueve lo elimina. Enviar campos inválidos enfoca Nombres y muestra
  errores de nombres, apellidos, correo y contraseña. No se crearon cuentas.
- Ocho pruebas de esquemas/destinos aprobadas; incluye mensajes y corrección del celular.
- ESLint aprobado para los seis archivos TypeScript modificados. diff --check aprobado.
- Se añadieron regresiones Playwright de cierre nativo con/sin movimiento y validación
  por campo. La suite completa de Playwright no se ejecutó en esta sesión.
- Typecheck global ejecutado: falla por cliente Prisma local desactualizado
  (PaymentAttempt/PaymentAttemptState/paymentIntegration ausentes del generado).
  No se modificó la base local ni se atribuye una validación global aprobada.

El Node instalado en Program Files (24.22.1) permitió ejecutar los checks; el shim
predeterminado de npm falla. Esto no reemplaza el toolchain canónico de CI.
