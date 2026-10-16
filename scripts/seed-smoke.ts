import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

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
    update: { price: "29.90", stock: 10, active: true },
    create: {
      name: "ROSH QA — Botella de prueba",
      slug: "rosh-qa-botella-de-prueba",
      sku: "QA-S1-01",
      shortDescription: "Producto ficticio para evidencias del Sprint 1.",
      description: "Datos sintéticos de QA. No representan una oferta comercial ni una compra real.",
      price: "29.90",
      stock: 10,
      featured: true,
      images: {
        create: {
          url: "/products/morado-intenso.webp",
          alt: "Imagen de referencia para producto ficticio de QA",
        },
      },
    },
  });
  const passwordHash = await hash(process.env.SMOKE_CUSTOMER_PASSWORD ?? "Qa-only-S1-02-12345", 12);
  const customer = await prisma.user.upsert({
    where: { email: "qa-s102@example.com" },
    update: { passwordHash, role: "CUSTOMER" },
    create: {
      email: "qa-s102@example.com", firstName: "Cliente", lastName: "QA",
      passwordHash,
    },
  });
  await prisma.shippingZone.upsert({
    where: { department_province_district: { department: "QA", province: "QA", district: "Distrito QA S1-02" } },
    update: { price: "8.50", active: true },
    create: { department: "QA", province: "QA", district: "Distrito QA S1-02", price: "8.50" },
  });
  const address = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!address) await prisma.address.create({ data: {
    userId: customer.id, label: "QA S1-02", recipient: "Cliente QA", phone: "000000000",
    department: "QA", province: "QA", district: "Distrito QA S1-02",
    addressLine1: "Dirección simulada — no realizar entregas", isDefault: true,
  } });
  await prisma.commerceSettings.upsert({
    where: { id: "default" },
    update: { transferEnabled: true, yapeEnabled: false, bankAccountLabel: "SIMULACIÓN QA — NO PAGAR", bankAccountNumber: "QA-NO-TRANSFERIR", bankAccountHolder: "Cliente ficticio de QA" },
    create: {
      id: "default", transferEnabled: true, bankAccountLabel: "SIMULACIÓN QA — NO PAGAR",
      bankAccountNumber: "QA-NO-TRANSFERIR", bankAccountHolder: "Cliente ficticio de QA",
    },
  });
  console.log("Fixture aislada de QA: producto, cliente y transferencia simulada; no realizar pagos reales.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
