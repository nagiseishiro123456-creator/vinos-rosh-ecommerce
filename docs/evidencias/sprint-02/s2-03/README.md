# Evidencias — S2-03

2026-10-19 (America/Lima). Capturas originales de la aplicación real en GitHub Actions,
con PostgreSQL QA aislado, Node 22 y Chromium de Playwright. Datos y cuentas sintéticos;
no hubo pagos reales ni acceso a Render. No se retocan ni recomprimen los PNG.

Fuente, run/artefacto, dimensiones, timestamps y hashes en [manifest.json](manifest.json).
[QA y resultados](../../../testing/s2-03-carrito-invitado.md) · [Validación](validacion-ci.txt).
Las 24 capturas de S2-02 y las anteriores se conservan en sus carpetas originales.

| Estado | Escritorio 1440 px | Móvil 390 px |
| --- | --- | --- |
| Añadido sin sesión, contador y precio del servidor | [Ver](ci-desktop-30-invitado-agregado.png) | [Ver](ci-mobile-30-invitado-agregado.png) |
| Precio 30.10 y stock 2: ajuste a S/60.20 | [Ver](ci-desktop-31-invitado-ajuste-servidor.png) | [Ver](ci-mobile-31-invitado-ajuste-servidor.png) |
| Producto retirado, aviso y carrito vacío | [Ver](ci-desktop-32-invitado-producto-retirado.png) | [Ver](ci-mobile-32-invitado-producto-retirado.png) |
| Recuperación de formato corrupto | [Ver](ci-desktop-33-invitado-recuperacion-formato.png) | [Ver](ci-mobile-33-invitado-recuperacion-formato.png) |
| Lectura bloqueada: memoria, 2 unidades, aviso de pérdida | [Ver](ci-desktop-34-invitado-memoria.png) | [Ver](ci-mobile-34-invitado-memoria.png) |
| Red fallida: selección conservada e importes por verificar | [Ver](ci-desktop-35-invitado-error-red.png) | [Ver](ci-mobile-35-invitado-error-red.png) |
| Cuenta con sesión: formulario de carrito sin JavaScript | [Ver](ci-desktop-36-cuenta-formulario-nativo.png) | [Ver](ci-mobile-36-cuenta-formulario-nativo.png) |
| Escritura sin cuota: selección temporal y rechazo de analítica | [Ver](ci-desktop-37-invitado-cuota.png) | [Ver](ci-mobile-37-invitado-cuota.png) |
| Invitado sin JavaScript: explicación y enlaces, sin carga permanente | [Ver](ci-desktop-38-invitado-sin-javascript.png) | [Ver](ci-mobile-38-invitado-sin-javascript.png) |

| Tamaño adicional | Añadido | Ajuste por servidor |
| --- | --- | --- |
| 320 px | [Ver](ci-small-mobile-30-invitado-agregado.png) | [Ver](ci-small-mobile-31-invitado-ajuste-servidor.png) |
| 768 px | [Ver](ci-tablet-30-invitado-agregado.png) | [Ver](ci-tablet-31-invitado-ajuste-servidor.png) |

Los tamaños indican viewport; las imágenes full-page pueden ser más altas. Se seleccionan
22 estados representativos de los cuatro proyectos; las demás capturas del mismo run
quedan en su artefacto de CI, sujeto a su plazo de retención. Este registro en Git conserva
la selección revisada junto a su origen.

El test retiene una respuesta real antigua para comprobar que una edición posterior gana,
inyecta fallos de almacenamiento/red y cambia precio/stock del fixture deliberadamente.
Los importes diferentes son parte de esos casos; no son una comparación de conversión.
La selección invitada y la de cuenta siguen separadas hasta S2-04, lo que se explica en la UI.
Las imágenes complementan aserciones de API/BD, teclado, geometría y ausencia de errores
de hidratación; no representan una certificación completa de accesibilidad.
