ALTER TABLE "Cart" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_revision_nonnegative" CHECK ("revision" >= 0);
CREATE TABLE "CartMutation" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "operationId" UUID NOT NULL,
  "requestHash" CHAR(64) NOT NULL, "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CartMutation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CartMutation_userId_operationId_key" ON "CartMutation"("userId", "operationId");
ALTER TABLE "CartMutation" ADD CONSTRAINT "CartMutation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
