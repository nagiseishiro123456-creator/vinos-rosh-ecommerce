import assert from "node:assert/strict";
import test from "node:test";

import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ReceiptType,
  UserRole,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { refundPaidOrder } from "../src/modules/orders/refund-service";

test("manual refund restores stock and records audit data", async () => {
  const stamp = Date.now().toString(36);
  const refundReference = `REF-${stamp}`;

  let customerId: string | undefined;
  let adminId: string | undefined;
  let productId: string | undefined;
  let orderId: string | undefined;

  try {
    const [customer, admin] = await Promise.all([
      prisma.user.create({
        data: {
          email: `refund-customer-${stamp}@example.com`,
          passwordHash: "integration-test-only",
          firstName: "Cliente",
          lastName: "Refund",
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: `refund-admin-${stamp}@example.com`,
          passwordHash: "integration-test-only",
          firstName: "Admin",
          lastName: "Refund",
          role: UserRole.ADMIN,
        },
        select: { id: true },
      }),
    ]);

    customerId = customer.id;
    adminId = admin.id;

    const product = await prisma.product.create({
      data: {
        name: `Producto refund ${stamp}`,
        slug: `producto-refund-${stamp}`,
        sku: `REFUND-${stamp}`,
        description: "Producto temporal para validar reembolsos manuales.",
        price: 30,
        stock: 0,
        active: true,
      },
      select: { id: true },
    });
    productId = product.id;

    const order = await prisma.order.create({
      data: {
        number: `ROSH-REFUND-${stamp}`,
        userId: customer.id,
        status: OrderStatus.PAID,
        subtotal: 60,
        shippingAmount: 10,
        total: 70,
        receiptType: ReceiptType.BOLETA,
        shippingRecipient: "Cliente Refund",
        shippingPhone: "999999999",
        shippingDepartment: "Lima",
        shippingProvince: "Lima",
        shippingDistrict: "Miraflores",
        shippingAddress: "Dirección temporal",
        paidAt: new Date("2026-10-07T10:00:00.000Z"),
        items: {
          create: {
            productId: product.id,
            productName: `Producto refund ${stamp}`,
            productSku: `REFUND-${stamp}`,
            unitPrice: 30,
            quantity: 2,
            subtotal: 60,
          },
        },
        payments: {
          create: {
            provider: PaymentProvider.YAPE_MANUAL,
            status: PaymentStatus.PAID,
            amount: 70,
            operationCode: `PAY-${stamp}`,
            paidAt: new Date("2026-10-07T10:00:00.000Z"),
          },
        },
      },
      select: { id: true },
    });
    orderId = order.id;

    const refundedAt = new Date("2026-10-07T12:30:00.000Z");

    await refundPaidOrder({
      orderId: order.id,
      adminId: admin.id,
      refundReference,
      now: refundedAt,
    });

    const [savedOrder, savedProduct, savedPayment, movement] = await Promise.all([
      prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        select: { status: true, refundedAt: true },
      }),
      prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        select: { stock: true },
      }),
      prisma.payment.findFirstOrThrow({
        where: { orderId: order.id },
        select: {
          status: true,
          refundReference: true,
          refundedAt: true,
          reviewedById: true,
        },
      }),
      prisma.inventoryMovement.findFirst({
        where: {
          orderId: order.id,
          productId: product.id,
          type: "ORDER_RELEASE",
        },
        select: {
          quantity: true,
          stockAfter: true,
          actorUserId: true,
        },
      }),
    ]);

    assert.equal(savedOrder.status, OrderStatus.REFUNDED);
    assert.equal(savedOrder.refundedAt?.toISOString(), refundedAt.toISOString());
    assert.equal(savedProduct.stock, 2);
    assert.equal(savedPayment.status, PaymentStatus.REFUNDED);
    assert.equal(savedPayment.refundReference, refundReference);
    assert.equal(savedPayment.refundedAt?.toISOString(), refundedAt.toISOString());
    assert.equal(savedPayment.reviewedById, admin.id);
    assert.deepEqual(movement, {
      quantity: 2,
      stockAfter: 2,
      actorUserId: admin.id,
    });
  } finally {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (customerId) await prisma.user.deleteMany({ where: { id: customerId } });
    if (adminId) await prisma.user.deleteMany({ where: { id: adminId } });
  }
});
