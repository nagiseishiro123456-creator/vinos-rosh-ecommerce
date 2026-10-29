# QA de conciliación y configuración de correo

2026-10-29. Base ec5303f. **270/270 servidor locales** en vinos_rosh_test, 16 migraciones.
Ocho casos PostgreSQL nuevos: no inventar importes, corrección con historial, concurrencia,
revocación de rol, rollback por auditoría, pago no aprobado, reembolso y cambios de importe.
Cuatro casos de contrato monetario/fechas y tres de diagnóstico sin secretos/inyección.
SQL en esquema aislado: sin backfill, pago histórico intacto, unicidad, comisión acotada,
evidencia del abono completa y cascade. Ninguna solicitud externa de correo o banco.
El caso de persistencia comprueba también respaldo JSON v3 con evidencia e historial.

Dump/restore nativos de bases temporales: S304 conserva 16 migraciones, mismo registro,
revisión 2, dos eventos con valores anteriores, comisión 2.50, abono 95.70, fecha/referencia,
estado MATCHED y rechazo de versión obsoleta. Stock 7, outbox QUEUED/0 intentos intacta.
Guarda CI/localhost/bases con prefijo aislado. El preparador solo aplicó la migración 16
conocida a desarrollo; no reseteó, sembró ni modificó registros comerciales.

TypeScript/ESLint y Prisma validate aprobados. Navegador integrado: estados desconocido,
diferencia y conciliado; 1280×720 y 390×844, sin desborde horizontal.
[Capturas](../evidencias/sprint-03/s3-04-conciliacion/README.md).
Playwright nuevo recorre aprobación real de fixture QA, rechazo por rol, diagnóstico,
error de comisión con valor conservado, diferencia/corrección y stock/pago intactos.
Build/regresión de navegador del incremento se verifican en CI al publicarlo; la CI verde
de ec5303f corresponde al incremento anterior.

Pendiente: entrega externa de correo, Resend/dominio, acceso y conciliación Izipay,
aceptación del propietario. Las demos no sustituyen esas verificaciones.
