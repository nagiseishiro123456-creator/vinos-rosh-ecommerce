-- Additive: no existing carts, stock, orders or payments are rewritten.
CREATE TABLE "CartImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importId" VARCHAR(80) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartImport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CartImport_userId_importId_key" ON "CartImport"("userId", "importId");
ALTER TABLE "CartImport" ADD CONSTRAINT "CartImport_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
