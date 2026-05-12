-- AlterTable: add denormalized fields
ALTER TABLE "Customer"
  ADD COLUMN "firstOrderAt" TIMESTAMP(3),
  ADD COLUMN "totalSpent"   DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill totalSpent: sum of non-canceled Order.total per customer
UPDATE "Customer" c SET
  "totalSpent" = COALESCE(
    (SELECT SUM(o.total)
     FROM "Order" o
     WHERE o."customerId" = c.id
       AND o."orderStatus" NOT IN ('CANCELED')),
    0
  );

-- Backfill firstOrderAt: earliest Order.createdAt per customer
UPDATE "Customer" c SET
  "firstOrderAt" = (
    SELECT MIN(o."createdAt")
    FROM "Order" o
    WHERE o."customerId" = c.id
  );
