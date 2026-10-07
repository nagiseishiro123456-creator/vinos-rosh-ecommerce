-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM (
    'CREATED',
    'PAYMENT_SUBMITTED',
    'PAYMENT_APPROVED',
    'PAYMENT_REJECTED',
    'STATUS_CHANGED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "OrderEventType" NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
CREATE INDEX "OrderEvent_actorUserId_idx" ON "OrderEvent"("actorUserId");
CREATE INDEX "OrderEvent_type_idx" ON "OrderEvent"("type");
CREATE INDEX "OrderEvent_createdAt_idx" ON "OrderEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OrderEvent"
ADD CONSTRAINT "OrderEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderEvent"
ADD CONSTRAINT "OrderEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
