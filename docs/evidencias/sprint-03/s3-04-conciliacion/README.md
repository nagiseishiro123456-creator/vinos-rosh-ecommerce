# Conciliación — evidencia local

2026-10-29, localhost:3000, Next development sobre ec5303f con cambios de trabajo.
Navegador integrado. Datos ficticios sin acceso bancario ni envíos externos.

| Archivo | Escenario | Viewport CSS |
| --- | --- | --- |
| 01-comision-desconocida.jpg | Comisión/abono sin inventar | 1280×720, página completa |
| 02-diferencia.jpg | Neto 95.70; abono 94.70; falta 1.00 | 1280×720, página completa |
| 03-conciliado.jpg | Abono igual al neto | 1280×720, página completa |
| 04-conciliacion-movil.jpg | Conciliado y controles responsive | 390×844, página completa |

El navegador descuenta 15 px de barra de scroll en el JPG (1265/375). DOM scrollWidth
no supera el viewport. No se atribuye a esta demo la validación administrativa de CI;
la suite genera por separado sus capturas privadas de fixtures QA.
