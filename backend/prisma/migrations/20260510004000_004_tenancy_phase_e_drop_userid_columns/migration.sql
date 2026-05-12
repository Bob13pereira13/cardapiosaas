-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_userId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "Combo" DROP CONSTRAINT "Combo_userId_fkey";

-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_userId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "OptionGroup" DROP CONSTRAINT "OptionGroup_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";

-- DropForeignKey
ALTER TABLE "Table" DROP CONSTRAINT "Table_userId_fkey";

-- DropIndex
DROP INDEX "AuditLog_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Coupon_userId_active_idx";

-- DropIndex
DROP INDEX "Coupon_userId_code_key";

-- DropIndex
DROP INDEX "Customer_userId_lastOrderAt_idx";

-- DropIndex
DROP INDEX "Customer_userId_name_idx";

-- DropIndex
DROP INDEX "Customer_userId_phone_key";

-- DropIndex
DROP INDEX "LoyaltyPoints_customerId_userId_key";

-- DropIndex
DROP INDEX "OptionGroup_userId_ativo_idx";

-- DropIndex
DROP INDEX "Order_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Order_userId_orderNumber_key";

-- DropIndex
DROP INDEX "Order_userId_orderStatus_idx";

-- DropIndex
DROP INDEX "Order_userId_origin_idx";

-- DropIndex
DROP INDEX "Table_userId_numero_key";

-- AlterTable
ALTER TABLE "Agendamento" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CartAbandonment" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Comanda" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Combo" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CustomerAuth" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LoyaltyPoints" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "LoyaltyTransaction" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "NpsResponse" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OptionGroup" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Table" DROP COLUMN "userId",
ALTER COLUMN "restaurantId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "Coupon_restaurantId_active_idx" ON "Coupon"("restaurantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_restaurantId_code_key" ON "Coupon"("restaurantId", "code");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_name_idx" ON "Customer"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_lastOrderAt_idx" ON "Customer"("restaurantId", "lastOrderAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_restaurantId_phone_key" ON "Customer"("restaurantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyPoints_customerId_restaurantId_key" ON "LoyaltyPoints"("customerId", "restaurantId");

-- CreateIndex
CREATE INDEX "OptionGroup_restaurantId_ativo_idx" ON "OptionGroup"("restaurantId", "ativo");

-- CreateIndex
CREATE INDEX "Order_restaurantId_orderStatus_idx" ON "Order"("restaurantId", "orderStatus");

-- CreateIndex
CREATE INDEX "Order_restaurantId_createdAt_idx" ON "Order"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_restaurantId_origin_idx" ON "Order"("restaurantId", "origin");

-- CreateIndex
CREATE UNIQUE INDEX "Order_restaurantId_orderNumber_key" ON "Order"("restaurantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Table_restaurantId_numero_key" ON "Table"("restaurantId", "numero");
