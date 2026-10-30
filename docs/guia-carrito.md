# Cómo entrar al carrito

Guía verificada contra `main` `83c8e5774af42d8b7c90dfd3135385faf3c8d0d9`.
Fecha del registro: 2026-10-21 (America/Lima).

## Accesos

1. Abrir la tienda y entrar a **Productos** (`/productos`).
2. Pulsar **Agregar al carrito** en un producto disponible. Se abre el panel lateral.
3. Para volver a abrirlo, pulsar la **bolsa de compras de la cabecera, arriba a la derecha**.
   En móvil también existe **Carrito** en la barra inferior; esa barra se retira en algunos
   pasos de compra para evitar superposiciones. La bolsa de la cabecera sigue siendo el acceso.
4. Dentro del panel, pulsar **Ver carrito completo**, o abrir directamente `/carrito`
   en el mismo dominio de la tienda. En desarrollo: `http://localhost:3000/carrito`.

El invitado puede preparar su selección sin cuenta. Para continuar al checkout necesita
ingresar o registrarse; la selección se une a su cuenta. Añadir productos no reserva stock:
la reserva sucede al confirmar el pedido. Sin JavaScript, el invitado recibe un enlace
para ingresar; el carrito de cuenta conserva formularios nativos.

## Qué versión se está viendo

El cierre técnico del Sprint 2 significa código integrado y verificado en GitHub.
No implica que el sitio remoto se haya actualizado. Los commits usaron `[skip render]`.
El registro anterior de Render indica servicios suspendidos y una versión de Fase 1;
**no se volvió a consultar ni a cambiar Render en este refinamiento**.

Si el sitio que se está visitando no tiene estos accesos o comportamientos, comparar
su commit desplegado con el anterior antes de concluir que el código falta. La URL
exacta que está visitando el propietario todavía no fue confirmada. No se inventa
un enlace público ni se presenta localhost como una web accesible desde otra computadora.

## Evidencia existente y aceptación pendiente

El panel está documentado en las [capturas de integración del Sprint 2](evidencias/sprint-02/integracion/README.md).
Esta imagen es de QA de CI, con producto ficticio; no es una captura nueva del sitio de Render:

![Carrito móvil de QA con cuatro unidades y enlace Ver carrito completo](evidencias/sprint-02/integracion/ci-mobile-66-carrito-integrado-panel.png)

El propietario indicó que no encuentra el carrito. Es una observación válida de
descubrimiento de la interfaz y mantiene pendiente la aceptación comercial. En la
próxima revisión acompañada se comprobarán acceso desde Home, catálogo y producto,
bolsa visible y reconocible, móvil/escritorio y versión desplegada. Si la bolsa sola
no se entiende, proponer una etiqueta visible **Carrito** y verificarla antes/después;
no se registra esa mejora como implementada con esta guía.

Referencias de código: [cabecera](../src/components/site-header.tsx),
[panel](../src/components/cart-drawer.tsx), [página completa](../src/app/carrito/page.tsx).
