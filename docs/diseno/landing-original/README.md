# Landing ROSH: referencia original

2026-11-01 (America/Lima). Mejoras del Sprint 5, continuación después de #26.

El propietario sustituye el material anterior por estos dos originales:

- `E:/vinos rosh/rosh-handoff original.zip`
  SHA256 `09552f8ed761464cc81b2ea2f71de1faba8752015729bdea32c44349b48b5d01`.
- `E:/vinos rosh/Vinos Rosh — Prototipos  orginal.pdf`, ocho páginas.
  SHA256 `249581781113fd8d70669e85133cefc75914d5c7a7c1f09da71c7337179d5545`.

Se leyó el handoff completo y se renderizaron/revisaron los ocho tableros. El PDF rige
la composición y el handoff los tiempos y detalles técnicos. HANDOFF.md conserva
el documento del ZIP correcto, sin sustituir las instrucciones del propietario.

## Alcance aceptado

Solo `/`: logo único, entrada, header, botella y racimo. El propietario confirma
que ROSH vende un solo producto; los registros locales son ejemplos y se arreglarán
después. **La botella no lleva enlace**. No se muestran catálogo, carrusel, precio
ni stock ficticios. No se modifican ni eliminan productos de la BD.

Carrito, acceso, historia, administración, pagos y pedidos mantienen sus módulos.
La landing usa los proveedores de carrito existentes, sus contadores y sus rutas.
Llamar utiliza el teléfono público configurado; si falta, el icono abre Contacto.

## Recursos y mantenimiento

`public/media/rosh/landing/` contiene los once recursos de assets del ZIP, conservados
byte por byte: logo y botella transparentes; racimo compuesto; máscara, sombras,
brillos y SVG de tallo/hoja; video y tres fotogramas. No se generan sustitutos con IA.

`src/app/fonts/` conserva Lora variable y su licencia OFL, obtenidas del repositorio
[Google Fonts](https://github.com/google/fonts/tree/main/ofl/lora). Se aloja localmente
con next/font/local, pesos 500–600, preload y display swap; no requiere Google Fonts
en el navegador ni descarga de fuentes al compilar.

`src/components/landing/landing-media.ts` es el adaptador de contenido del racimo.
El admin actual no tiene una colección publicada específica para Home: se usa
sueno.mp4, como autoriza el handoff. El componente admite una lista ordenada futura,
sin crear paneles, endpoints de carga o borradores fuera del alcance de esta entrega.

## Decisiones de implementación

- Una sola imagen de logo. Se mide el hueco real, sin transformar ese hueco al revelar
  la navegación, evitando una corrección artificial de 12 px.
- 0–3 s aparición/pausa; 3 s viaje; 4,3 s botella; 5,4 s header; 6,8 s libera documento.
  El fundido del racimo comienza 0,5 s después del header y termina después del desbloqueo.
- Ajuste del 2026-11-02 por revisión del propietario: la entrada vuelve a reproducirse
  al abrir o recargar Inicio. Una marca antigua de sessionStorage no la oculta; no se
  necesita almacenamiento para reproducirla. La navegación interna de ida y vuelta
  mantiene el estado final para no interrumpir la compra. El HANDOFF original conserva
  su indicación histórica de una vez por sesión. Movimiento reducido y `#comprar`
  siguen mostrando el estado final. Escape o el enlace de salto permiten terminarla.
- El bloqueo usa selectores limitados a esta landing: nunca sobrescribe body.style
  ni el bloqueo del carrito. Los temporizadores, frames, observadores y eventos se retiran.
- CSS y tipografía limitados a la landing; no se cambian los tokens de otras pantallas.
- En móvil se sigue el ancho visual del PDF: racimo igual al viewport menos 32 px.
  El menú añade los enlaces que el prototipo HTML de referencia todavía oculta.
- Video sin audio, autoplay/loop/playsinline y metadata; poster si se reduce movimiento,
  se ahorran datos, hay conexión lenta o falla reproducción. No se descarga MP4 en
  ahorro de datos ni se monta este reproductor en otras rutas.
- Presupuesto de CSS inicial de Home: 92 000 bytes decodificados. Las otras rutas
  conservan el umbral previo de crecimiento de 1024 bytes; se registra el antes/después.
  Esta animación de entrada es una decisión del diseño, no una mejora acreditada de LCP.

La alternativa editorial local anterior queda sustituida para Home; su copia previa
se conserva en la caché de trabajo y sus archivos no usados permanecen fuera del incremento.

[QA](../../testing/s5-06-landing-original.md) · [Cómo probar](../../guia-landing-rosh.md).
