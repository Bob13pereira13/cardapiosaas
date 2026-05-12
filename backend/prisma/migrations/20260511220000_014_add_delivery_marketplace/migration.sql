-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('BAIRRO_LIST', 'RADIUS');

-- CreateEnum
CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETRY_SCHEDULED', 'CANCELED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('OWN', 'IFOOD', 'NINETYNINEFOOD', 'KEETA');

-- CreateEnum
CREATE TYPE "MarketplaceProvider" AS ENUM ('IFOOD', 'NINETYNINEFOOD', 'KEETA');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "marketplaceIntegrationId" INTEGER,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'OWN';

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "cep" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tipo" "ZoneType" NOT NULL,
    "bairros" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "fretefixo" DECIMAL(10,2) NOT NULL,
    "tempoEstimadoMin" INTEGER NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "tabId" INTEGER,
    "status" "DeliveryAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL,
    "assignedTo" TEXT,
    "failureReason" TEXT,
    "observacao" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByAccountId" INTEGER,
    "updatedByAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceIntegration" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "marketplace" "MarketplaceProvider" NOT NULL,
    "externalMerchantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "authData" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryZone_restaurantId_isActive_idx" ON "DeliveryZone"("restaurantId", "isActive");

-- CreateIndex
CREATE INDEX "DeliveryZone_restaurantId_tipo_idx" ON "DeliveryZone"("restaurantId", "tipo");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_restaurantId_status_idx" ON "DeliveryAttempt"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_orderId_idx" ON "DeliveryAttempt"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_tabId_idx" ON "DeliveryAttempt"("tabId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_orderId_attemptNumber_key" ON "DeliveryAttempt"("orderId", "attemptNumber");

-- CreateIndex
CREATE INDEX "MarketplaceIntegration_marketplace_isActive_idx" ON "MarketplaceIntegration"("marketplace", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceIntegration_restaurantId_marketplace_key" ON "MarketplaceIntegration"("restaurantId", "marketplace");

-- CreateIndex
CREATE INDEX "Order_source_restaurantId_idx" ON "Order"("source", "restaurantId");

-- CreateIndex
CREATE INDEX "Order_externalOrderId_idx" ON "Order"("externalOrderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_marketplaceIntegrationId_fkey" FOREIGN KEY ("marketplaceIntegrationId") REFERENCES "MarketplaceIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceIntegration" ADD CONSTRAINT "MarketplaceIntegration_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
