# QA — Sprint 4, direcciones y cobertura

2026-10-30. Base 70f6dbc. **286/286 servidor** en vinos_rosh_test local, 16 migraciones
existentes. No se alteró el esquema ni se sembraron datos en desarrollo.

Reproducción: al iniciar, PostgreSQL estaba apagado; ese primer fallo de conexión no se
cuenta como prueba del bug. Con Docker disponible, se ejecutó la nueva regresión contra
una copia de snapshot.ts de main: UNSUPPORTED_ZONE para nombres equivalentes. El mismo
caso pasa con la función compartida. Copias y logs de trabajo permanecen ignorados.

Nuevos casos: mayúsculas/tildes/espacios y provincia; ambigüedad y pausadas; importes
canónicos y celular; guardar precio pausado; replay y versión obsoleta; creación concurrente
duplicada; legado ambiguo y resolución mediante pausa; rol revocado; dos primeras
direcciones, archivo/principal simultáneos, propiedad ajena, falta de cobertura, límite
y conservación del snapshot de un pedido. Tipos y ESLint aprobados localmente.

SQL de migraciones anteriores conserva su regresión. Nuevos Playwright comprueban
consulta pública, vacío por búsqueda, precio/cobertura y checkout coherentes, edición
de una zona pausada, errores que conservan datos y guardado/archivo de principal.
La compilación/regresión de navegador completa se valida en CI al publicar; no se atribuye
la CI de la base a este nuevo incremento.

Revisión manual integrada: demo y página real; búsqueda ignorando mayúsculas, resultado
sin cobertura y móvil 390. [Capturas y límites](../evidencias/sprint-04/cobertura-direcciones/README.md).
La demo no confirma tarifas comerciales, mapas ni cobertura oficial. UAT pendiente.
