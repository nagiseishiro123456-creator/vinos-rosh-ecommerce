import { PrismaClient } from "@prisma/client";

// This fixture must never target a deployed or business database.
const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
if (
  process.env.SMOKE_TEST_DATA !== "true" ||
  !["vinos_rosh_ci", "vinos_rosh_test"].includes(databaseName)
) {
  throw new Error("SMOKE_TEST_DATA=true y una BD vinos_rosh_ci/test son obligatorios.");
}

const prisma = new PrismaClient();
async function main() {
  await prisma.product.upsert({
    where: { slug: "rosh-qa-botella-de-prueba" },
    update: {},
    create: {
      name: "ROSH QA — Botella de prueba",
      slug: "rosh-qa-botella-de-prueba",
      sku: "QA-S1-01",
      shortDescription: "Producto ficticio para evidencias del Sprint 1.",
      description: "Datos sintéticos de QA. No representan una oferta comercial ni una compra real.",
      price: "29.90",
      stock: 3,
      featured: true,
      images: {
        create: {
          url: "/products/morado-intenso.webp",
          alt: "Imagen de referencia para producto ficticio de QA",
        },
      },
    },
  });
  console.log("Fixture visual de QA preparada (sin datos de clientes ni medios de pago).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
