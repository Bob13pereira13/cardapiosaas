CREATE TABLE IF NOT EXISTS "Customer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "document" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastOrderAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerId" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_userId_phone_key" ON "Customer"("userId", "phone");
CREATE INDEX IF NOT EXISTS "Customer_userId_name_idx" ON "Customer"("userId", "name");
CREATE INDEX IF NOT EXISTS "Customer_userId_lastOrderAt_idx" ON "Customer"("userId", "lastOrderAt");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Customer_userId_fkey'
  ) THEN
    ALTER TABLE "Customer"
      ADD CONSTRAINT "Customer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_customerId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
