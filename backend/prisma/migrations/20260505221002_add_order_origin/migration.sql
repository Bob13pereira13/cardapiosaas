-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('WEBSITE', 'MANUAL', 'WHATSAPP_BOT', 'IFOOD', 'RAPPI_99', 'UBER_EATS', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "externalChannel" TEXT,
ADD COLUMN     "externalOrderId" TEXT,
ADD COLUMN     "origin" "OrderOrigin" NOT NULL DEFAULT 'WEBSITE';

-- CreateIndex
CREATE INDEX "Order_userId_origin_idx" ON "Order"("userId", "origin");
