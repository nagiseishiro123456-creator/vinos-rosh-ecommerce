# Punto de avance

- Fase: 2. Sprint: 1. Historia activa: S1-01.
- Fecha: 2026-10-15 (America/Lima).
- Base: `b4831eab1eaf7c3486b4bf8643001edefb5decc2` de `main`.
- Rama: `fase-2/sprint-01-base-reproducible`.
- Estado: en validación; no se declara cerrado el Sprint 1.

## Trabajo preparado
Lockfile y toolchain fijados, instalación con `npm ci` en CI/preview/Docker/setup,
preparación de assets standalone y documentación de continuidad.
Smoke de navegador y capturas desktop/móvil con fixture aislada, sin clientes ni pagos reales.

## Verificación inicial
Node 22.23.3 / npm 11.9.0: Prisma Client generado, 8 pruebas sin BD,
lint, typecheck y build aprobados. Auditoría de producción sin vulnerabilidades reportadas.
Las pruebas con PostgreSQL se verifican en el servicio temporal de GitHub Actions:
el contenedor de trabajo no permite iniciar la base de forma convencional.
Resultados finales y enlaces: [QA](testing/sprint-01.md).

## Siguiente acción
Terminar validación de S1-01 en CI y revisar capturas. Después, iniciar S1-02:
trazar todos los cálculos monetarios y definir una política uniforme con `Prisma.Decimal`.
Mantener las siguientes historias pendientes hasta implementarlas y verificarlas.

## Riesgos abiertos
- La revisión de pagos manuales puede vencer automáticamente: se corregirá en S1-05.
- El código inicial presenta instrucciones de pago antes de reservar stock: S1-03.
- Los cálculos usan conversiones a `Number`: S1-02.
- Docker y PowerShell no se ejecutan en este contenedor; validar en esos entornos antes de declararlos probados.
- Render sigue siendo preview; no se realiza merge a main ni despliegue en esta entrega.
