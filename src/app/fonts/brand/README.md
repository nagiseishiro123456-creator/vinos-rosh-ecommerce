# Fuentes de la empresa

Fuentes proporcionadas por el cliente en CAMBRIA.rar y JANE.rar.

- Cambria Regular y Bold: títulos y cifras editoriales.
- Jane Regular: textos, navegación y controles.

Se sirven localmente con next/font, sin solicitar fuentes a Google ni a otros
servicios. Los WOFF2 conservan nombres y metadatos de las fuentes originales.
Incluyen caracteres latinos (acentos, ñ, ¡, ¿), puntuación, monedas y flechas.
Otros alfabetos pueden recurrir a las fuentes de respaldo del dispositivo.

Para regenerarlos, extraer los archivos del cliente en una carpeta de trabajo
y ejecutar `scripts/prepare-brand-fonts.py --source <carpeta>`, con FontTools y
Brotli instalados en el entorno de herramientas. En esta preparación se usaron
FontTools 4.68.0 y Brotli 1.2.1. Los originales se conservan fuera del repositorio.
