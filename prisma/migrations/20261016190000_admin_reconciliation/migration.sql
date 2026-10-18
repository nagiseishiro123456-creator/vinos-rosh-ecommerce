-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "receivedAmount" DECIMAL(10,2) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),
    "refundReference" VARCHAR(120),

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_actorUserId_idx" ON "OrderEvent"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReconciliation_paymentId_key" ON "PaymentReconciliation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_refundedAt_openedAt_idx" ON "PaymentReconciliation"("refundedAt", "openedAt");

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Positive, exact received amount; closing requires both date and reference.
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_amount_check" CHECK ("receivedAmount" > 0);
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_refund_check" CHECK (
  ("refundedAt" IS NULL AND "refundReference" IS NULL) OR
  ("refundedAt" IS NOT NULL AND length(trim("refundReference")) BETWEEN 3 AND 120 AND "refundReference" IS NOT NULL)
);

