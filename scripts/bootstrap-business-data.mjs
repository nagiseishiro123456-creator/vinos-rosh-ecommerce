import {
  InventoryMovementType,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCT_IMAGE =
  "https://nagiseishiro123456-creator.github.io/vinos-rosh-prototype/assets/products.jpg";

const products = [
  {
    name: "Vinos ROSH - Morado Intenso",
    slug: "vinos-rosh-morado-intenso",
    sku: "ROSH-MOR-750",
    shortDescription: "Bebida de uva sin alcohol · perfil Malbec · 750 ml",
    description:
      "Bebida de uva sin alcohol de cuerpo medio, con perfil profundo de frutos rojos y ciruela, acompañado por un sutil matiz tostado. Su equilibrio la hace versátil para acompañar comidas y reuniones especiales. Presentación en botella de vidrio oscuro estilo bordelés de 750 ml.",
    price: 45,
    stock: 120,
    featured: true,
  },
  {
    name: "Vinos ROSH - Blanco Cítrico",
    slug: "vinos-rosh-blanco-citrico",
    sku: "ROSH-BLA-750",
    shortDescription: "Bebida de uva sin alcohol · perfil Sauvignon · 750 ml",
    description:
      "Bebida de uva blanca sin alcohol, joven y refrescante, con perfil aromático de maracuyá, durazno y notas herbáceas. Pensada para servir fría y acompañar preparaciones ligeras. Presentación en botella estilizada de 750 ml con cápsula plateada.",
    price: 38,
    stock: 85,
    featured: true,
  },
  {
    name: "Vinos ROSH - Morado Edición Reserva",
    slug: "vinos-rosh-morado-edicion-reserva",
    sku: "ROSH-RES-750",
    shortDescription: "Bebida de uva sin alcohol · edición premium · 750 ml con estuche",
    description:
      "Edición premium de bebida de uva sin alcohol con perfil inspirado en Cabernet Sauvignon. Presenta carácter intenso, color profundo y notas evocadoras de vainilla y cacao. Se entrega en botella de vidrio grueso de 750 ml dentro de un estuche individual negro ROSH.",
    price: 85,
    stock: 40,
    featured: true,
  },
  {
    name: "Vinos ROSH - Dulce Atardecer",
    slug: "vinos-rosh-dulce-atardecer",
    sku: "ROSH-DUL-750",
    shortDescription: "Bebida de uva sin alcohol · perfil semi-seco · 750 ml",
    description:
      "Bebida de uva sin alcohol de perfil afrutado y amable, con dulzor equilibrado y notas de fresas y cerezas maduras. Ideal para reuniones, aperitivos y acompañamientos dulces o suaves. Presentación en botella clásica de 750 ml con tapa rosca.",
    price: 35,
    stock: 150,
    featured: true,
  },
];

const shippingZones = [
  ["Lima", "Lima", "Miraflores", 10],
  ["Lima", "Lima", "San Isidro", 10],
  ["Lima", "Lima", "Santiago de Surco", 10],
  ["Lima", "Lima", "San Borja", 10],
  ["Lima", "Lima", "La Molina", 10],
  ["Lima", "Lima", "Barranco", 10],
  ["Lima", "Lima", "Surquillo", 10],
  ["Lima", "Lima", "Jesús María", 10],
  ["Lima", "Lima", "Lince", 10],
  ["Lima", "Lima", "Magdalena del Mar", 10],
  ["Lima", "Lima", "Pueblo Libre", 10],
  ["Lima", "Lima", "Chorrillos", 15],
  ["Lima", "Lima", "San Miguel", 15],
  ["Lima", "Lima", "Breña", 15],
  ["Lima", "Lima", "Cercado de Lima", 15],
  ["Lima", "Lima", "Los Olivos", 15],
  ["Lima", "Lima", "San Martín de Porres", 15],
  ["Lima", "Lima", "Independencia", 15],
  ["Lima", "Lima", "Ate", 18],
  ["Lima", "Lima", "Santa Anita", 18],
  ["Lima", "Lima", "Comas", 18],
  ["Lima", "Lima", "Villa El Salvador", 18],
  ["Lima", "Lima", "Villa María del Triunfo", 18],
];

async function upsertProduct(categoryId, data) {
  const existing = await prisma.product.findUnique({
    where: { slug: data.slug },
    select: { id: true, stock: true },
  });

  if (!existing) {
    const created = await prisma.product.create({
      data: {
        ...data,
        categoryId,
        active: true,
        images: {
          create: {
            url: PRODUCT_IMAGE,
            alt: data.name,
            position: 0,
          },
        },
      },
      select: { id: true },
    });

    if (data.stock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: created.id,
          type: InventoryMovementType.INITIAL_STOCK,
          quantity: data.stock,
          stockAfter: data.stock,
          note: "Carga inicial confirmada del catálogo ROSH",
        },
      });
    }

    return;
  }

  const delta = data.stock - existing.stock;

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      sku: data.sku,
      shortDescription: data.shortDescription,
      description: data.description,
      price: data.price,
      stock: data.stock,
      featured: data.featured,
      active: true,
      categoryId,
    },
  });

  const firstImage = await prisma.productImage.findFirst({
    where: { productId: existing.id },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  if (firstImage) {
    await prisma.productImage.update({
      where: { id: firstImage.id },
      data: { url: PRODUCT_IMAGE, alt: data.name, position: 0 },
    });
  } else {
    await prisma.productImage.create({
      data: {
        productId: existing.id,
        url: PRODUCT_IMAGE,
        alt: data.name,
        position: 0,
      },
    });
  }

  if (delta !== 0) {
    await prisma.inventoryMovement.create({
      data: {
        productId: existing.id,
        type: InventoryMovementType.MANUAL_ADJUSTMENT,
        quantity: delta,
        stockAfter: data.stock,
        note: "Sincronización inicial de stock confirmado ROSH",
      },
    });
  }
}

async function main() {
  if (process.env.BOOTSTRAP_BUSINESS_DATA !== "true") {
    console.log("BOOTSTRAP_BUSINESS_DATA no está activo; no se cargan datos comerciales.");
    return;
  }

  const category = await prisma.category.upsert({
    where: { slug: "bebidas-de-uva-sin-alcohol" },
    update: {
      name: "Bebidas de uva sin alcohol",
      description: "Catálogo ROSH de bebidas de uva 0.0% alcohol.",
      active: true,
    },
    create: {
      name: "Bebidas de uva sin alcohol",
      slug: "bebidas-de-uva-sin-alcohol",
      description: "Catálogo ROSH de bebidas de uva 0.0% alcohol.",
      active: true,
    },
    select: { id: true },
  });

  for (const product of products) {
    await upsertProduct(category.id, product);
  }

  for (const [department, province, district, price] of shippingZones) {
    await prisma.shippingZone.upsert({
      where: {
        department_province_district: {
          department,
          province,
          district,
        },
      },
      update: { price, active: true },
      create: {
        department,
        province,
        district,
        price,
        active: true,
      },
    });
  }

  await prisma.commerceSettings.upsert({
    where: { id: "default" },
    update: {
      contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "nagiseishiro123456@gmail.com",
      whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "51937137465",
      yapeEnabled: true,
      yapePhone: process.env.YAPE_PHONE || "937137465",
      yapeQrImageUrl: process.env.YAPE_QR_IMAGE_URL || null,
      transferEnabled: false,
    },
    create: {
      id: "default",
      contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "nagiseishiro123456@gmail.com",
      whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "51937137465",
      yapeEnabled: true,
      yapePhone: process.env.YAPE_PHONE || "937137465",
      yapeQrImageUrl: process.env.YAPE_QR_IMAGE_URL || null,
      transferEnabled: false,
    },
  });

  console.log(
    `Datos comerciales cargados: ${products.length} productos y ${shippingZones.length} zonas de envío.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
