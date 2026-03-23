# Admin Styling Notes (Astro)

Para evitar botones/listados sin estilo en páginas admin:

1. **Si el HTML se inyecta por JS (`innerHTML`)**, sus clases deben tener estilos con `:global(...)` en el `<style>` de Astro.
   - Ejemplo: `:global(.btn-mini)`, `:global(.admin-file)`, `:global(.admin-actions)`.
2. Si usas clases locales (sin `:global`) solo aplican al markup escrito en el `.astro`, no al HTML inyectado dinámicamente.
3. Reutilizar clases compartidas con este patrón:
   - Tarjeta/listado: `.admin-file`, `.admin-file__thumb`, `.admin-file__name`, `.admin-file__path`
   - Botones secundarios: `.btn-mini`, `.btn-mini.danger`
4. Antes de cerrar cambios de UI admin:
   - revisar en `/admin/panel`, `/admin/plantillas`, `/admin/productos`
   - validar que acciones renderizadas por JS conservan estilos.

Regla rápida: **si un elemento viene de JS, su CSS va con `:global`**.
