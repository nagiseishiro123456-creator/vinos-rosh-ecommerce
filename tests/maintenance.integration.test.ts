import assert from "node:assert/strict";
import test from "node:test";

import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ReceiptType,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { runMaintenance } from "../src/modules/maintenance/service";

test("maintenance cancels expired manual-payment orders and restores stock", async () => {
  const stamp = Date.now().toString(36);
  const email = `maintenance-${stamp}@example.com`;
  const sku = `TEST-${stamp}`;
  const previousHold = process.env.MANUAL_PAYMENT_HOLD_MINUTES;
  process.env.MANUAL_PAYMENT_HOLD_MINUTES = "15";

  let userId: string | undefined;
  let productId: string | undefined;
  let orderId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "integration-test-only",
        firstName: "Test",
        lastName: "Maintenance",
      },
      select: { id: true },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: {
        name: `Producto mantenimiento ${stamp}`,
        slug: `producto-mantenimiento-${stamp}`,
        sku,
        description: "Producto temporal para validar liberación automática de stock.",
        price: 25,
        stock: 0,
        active: true,
      },
      select: { id: true },
    });
    productId = product.id;

    const order = await prisma.order.create({
      data: {
        number: `ROSH-TEST-${stamp}`,
        userId: user.id,
        status: OrderStatus.PAYMENT_REVIEW,
        subtotal: 50,
        shippingAmount: 10,
        total: 60,
        receiptType: ReceiptType.BOLETA,
        shippingRecipient: "Cliente Test",
        shippingPhone: "999999999",
        shippingDepartment: "Lima",
        shippingProvince: "Lima",
        shippingDistrict: "Miraflores",
        shippingAddress: "Dirección temporal",
        createdAt: new Date("2026-10-07T10:00:00.000Z"),
        items: {
          create: {
            productId: product.id,
            productName: `Producto mantenimiento ${stamp}`,
            productSku: sku,
            unitPrice: 25,
            quantity: 2,
            subtotal: 50,
          },
        },
        payments: {
          create: {
            provider: PaymentProvider.YAPE_MANUAL,
            status: PaymentStatus.UNDER_REVIEW,
            amount: 60,
            operationCode: `OP-${stamp}`,
          },
        },
      },
      select: { id: true },
    });
    orderId = order.id;

    const result = await runMaintenance(new Date("2026-10-07T12:00:00.000Z"));

    const [savedOrder, savedProduct, savedPayment, releaseMovement] =
      await Promise.all([
        prisma.order.findUniqueOrThrow({
          where: { id: order.id },
          select: { status: true },
        }),
        prisma.product.findUniqueOrThrow({
          where: { id: product.id },
          select: { stock: true },
        }),
        prisma.payment.findFirstOrThrow({
          where: { orderId: order.id },
          select: { status: true },
        }),
        prisma.inventoryMovement.findFirst({
          where: {
            orderId: order.id,
            productId: product.id,
            type: "ORDER_RELEASE",
          },
          select: { quantity: true, stockAfter: true },
        }),
      ]);

    assert.equal(result.expiredOrdersReleased, 1);
    assert.equal(savedOrder.status, OrderStatus.CANCELLED);
    assert.equal(savedProduct.stock, 2);
    assert.equal(savedPayment.status, PaymentStatus.CANCELLED);
    assert.deepEqual(releaseMovement, { quantity: 2, stockAfter: 2 });
  } finally {
    if (orderId) {
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    if (previousHold === undefined) {
      delete process.env.MANUAL_PAYMENT_HOLD_MINUTES;
    } else {
      process.env.MANUAL_PAYMENT_HOLD_MINUTES = previousHold;
    }
  }
});
