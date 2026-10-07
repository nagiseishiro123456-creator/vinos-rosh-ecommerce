-- Replace only the principal image of the four existing ROSH products.
-- Product identity, pricing, inventory, orders and reviews remain intact.
WITH photos (slug, url) AS (
  VALUES
    ('vinos-rosh-morado-intenso', '/products/morado-intenso.webp'),
    ('vinos-rosh-blanco-citrico', '/products/blanco-citrico.webp'),
    ('vinos-rosh-morado-edicion-reserva', '/products/morado-edicion-reserva.webp'),
    ('vinos-rosh-dulce-atardecer', '/products/dulce-atardecer.webp')
)
UPDATE "ProductImage" AS image
SET url = photos.url, alt = product.name
FROM "Product" AS product, photos
WHERE product.slug = photos.slug
  AND image.id = (
    SELECT principal.id
    FROM "ProductImage" AS principal
    WHERE principal."productId" = product.id
    ORDER BY principal.position, principal."createdAt", principal.id
    LIMIT 1
  );
