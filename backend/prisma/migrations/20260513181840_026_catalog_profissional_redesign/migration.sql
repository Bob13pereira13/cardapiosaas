-- CreateEnum
CREATE TYPE "OptionStockStatus" AS ENUM ('ACTIVE', 'OUT_OF_STOCK', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ComplementSelectionRule" AS ENUM ('SINGLE', 'MULTI_NO_REPEAT', 'MULTI_REPEAT');

-- CreateEnum
CREATE TYPE "ComplementLink" AS ENUM ('DELIVERY', 'BALCAO', 'MESA_PUBLIC', 'MESA_INTERNAL', 'PREVIEW');

-- CreateEnum
CREATE TYPE "ComplementVisibility" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('UNIT', 'KG', 'GRAM', 'LITER', 'ML', 'PORTION');

-- CreateEnum
CREATE TYPE "ProductOrderType" AS ENUM ('DELIVERY', 'PICKUP', 'DINE_IN');

-- CreateEnum
CREATE TYPE "ProductLink" AS ENUM ('DELIVERY', 'MESA_PUBLIC', 'MESA_INTERNAL', 'BALCAO', 'PREVIEW');

-- CreateEnum
CREATE TYPE "ProductLabel" AS ENUM ('HIGHLIGHT', 'RECOMMENDED', 'NEW', 'LIMITED_EDITION');

-- CreateEnum
CREATE TYPE "ComplementPriceMode" AS ENUM ('SUM_OF_SELECTED', 'AVERAGE_OF_SELECTED', 'HIGHEST_SELECTED', 'LOWEST_SELECTED');

-- DropForeignKey
ALTER TABLE "Option" DROP CONSTRAINT "Option_optionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "OptionGroup" DROP CONSTRAINT "OptionGroup_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_productionSectorId_fkey";

-- DropForeignKey
ALTER TABLE "ProductComplement" DROP CONSTRAINT "ProductComplement_optionGroupId_fkey";

-- DropIndex
DROP INDEX "Product_productionSectorId_idx";

-- DropIndex
DROP INDEX "ProductComplement_optionGroupId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "deletedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Option" DROP COLUMN "available",
DROP COLUMN "descricao",
DROP COLUMN "displayOrder",
DROP COLUMN "estoque",
DROP COLUMN "imagem",
DROP COLUMN "nome",
DROP COLUMN "optionGroupId",
DROP COLUMN "priceModifier",
ADD COLUMN     "codePdv" TEXT,
ADD COLUMN     "costPrice" DECIMAL(10,2),
ADD COLUMN     "deletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "restaurantId" INTEGER NOT NULL,
ADD COLUMN     "stockStatus" "OptionStockStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "useTechSheet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "selectedOptions";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "productionSectorId",
ADD COLUMN     "availableLinks" "ProductLink"[] DEFAULT ARRAY[]::"ProductLink"[],
ADD COLUMN     "codePdv" TEXT,
ADD COLUMN     "costPrice" DECIMAL(10,2),
ADD COLUMN     "customNameKds" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "hideObservations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideQtyButtons" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internalCode" TEXT,
ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPromotional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isServiceFeeFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labelType" "ProductLabel",
ADD COLUMN     "orderTypes" "ProductOrderType"[] DEFAULT ARRAY[]::"ProductOrderType"[],
ADD COLUMN     "promoEndsAt" TIMESTAMP(3),
ADD COLUMN     "promoSchedule" JSONB,
ADD COLUMN     "promoStartsAt" TIMESTAMP(3),
ADD COLUMN     "unitOfMeasure" "ProductUnit" NOT NULL DEFAULT 'UNIT',
ADD COLUMN     "useCustomNameKds" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "useTechSheet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductComplement" DROP CONSTRAINT "ProductComplement_pkey",
DROP COLUMN "optionGroupId",
DROP COLUMN "ordem",
ADD COLUMN     "complementId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "ProductComplement_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "OptionGroup";

-- DropEnum
DROP TYPE "OptionGroupTipo";

-- DropEnum
DROP TYPE "OptionPriceMode";

-- CreateTable
CREATE TABLE "Complement" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selectionRule" "ComplementSelectionRule" NOT NULL,
    "priceMode" "ComplementPriceMode" NOT NULL DEFAULT 'SUM_OF_SELECTED',
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "availableLinks" "ComplementLink"[],
    "visibility" "ComplementVisibility" NOT NULL DEFAULT 'VISIBLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Complement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplementOption" (
    "id" SERIAL NOT NULL,
    "complementId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplementOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrintArea" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "productionSectorId" INTEGER NOT NULL,

    CONSTRAINT "ProductPrintArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemComplement" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "complementId" INTEGER,
    "complementNameSnapshot" TEXT NOT NULL,
    "selectionRuleSnapshot" "ComplementSelectionRule" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemComplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemOption" (
    "id" SERIAL NOT NULL,
    "orderItemComplementId" INTEGER NOT NULL,
    "optionId" INTEGER,
    "optionNameSnapshot" TEXT NOT NULL,
    "optionPriceSnapshot" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complement_restaurantId_isActive_deletedAt_idx" ON "Complement"("restaurantId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "Complement_restaurantId_name_idx" ON "Complement"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "ComplementOption_complementId_sortOrder_idx" ON "ComplementOption"("complementId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ComplementOption_complementId_optionId_key" ON "ComplementOption"("complementId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrintArea_productId_productionSectorId_key" ON "ProductPrintArea"("productId", "productionSectorId");

-- CreateIndex
CREATE INDEX "OrderItemComplement_orderItemId_idx" ON "OrderItemComplement"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemOption_orderItemComplementId_idx" ON "OrderItemOption"("orderItemComplementId");

-- CreateIndex
CREATE INDEX "Option_restaurantId_isActive_deletedAt_idx" ON "Option"("restaurantId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "Option_restaurantId_name_idx" ON "Option"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_internalCode_key" ON "Product"("internalCode");

-- CreateIndex
CREATE INDEX "Product_restaurantId_disponivel_deletedAt_idx" ON "Product"("restaurantId", "disponivel", "deletedAt");

-- CreateIndex
CREATE INDEX "ProductComplement_productId_sortOrder_idx" ON "ProductComplement"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductComplement_productId_complementId_key" ON "ProductComplement"("productId", "complementId");

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complement" ADD CONSTRAINT "Complement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementOption" ADD CONSTRAINT "ComplementOption_complementId_fkey" FOREIGN KEY ("complementId") REFERENCES "Complement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementOption" ADD CONSTRAINT "ComplementOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComplement" ADD CONSTRAINT "ProductComplement_complementId_fkey" FOREIGN KEY ("complementId") REFERENCES "Complement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrintArea" ADD CONSTRAINT "ProductPrintArea_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrintArea" ADD CONSTRAINT "ProductPrintArea_productionSectorId_fkey" FOREIGN KEY ("productionSectorId") REFERENCES "ProductionSector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemComplement" ADD CONSTRAINT "OrderItemComplement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemComplement" ADD CONSTRAINT "OrderItemComplement_complementId_fkey" FOREIGN KEY ("complementId") REFERENCES "Complement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_orderItemComplementId_fkey" FOREIGN KEY ("orderItemComplementId") REFERENCES "OrderItemComplement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- PartialIndex: unicidade Option(restaurantId, name) apenas para registros ativos
CREATE UNIQUE INDEX "Option_restaurant_name_unique_active"
  ON "Option"("restaurantId", "name")
  WHERE "deletedAt" IS NULL;
