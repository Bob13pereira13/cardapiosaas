-- CreateEnum
CREATE TYPE "TabStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TabTipo" AS ENUM ('SALAO', 'DELIVERY', 'RETIRADA', 'BALCAO');

-- CreateEnum
CREATE TYPE "TabPaymentMethod" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'VOUCHER_REFEICAO', 'FIADO', 'CORTESIA');

-- CreateEnum
CREATE TYPE "TabPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tabId" INTEGER;

-- CreateTable
CREATE TABLE "Tab" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "tableId" INTEGER,
    "numeroComandaFisica" TEXT,
    "customerId" INTEGER,
    "customerNome" TEXT,
    "status" "TabStatus" NOT NULL DEFAULT 'OPEN',
    "tipo" "TabTipo" NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedByAccountId" INTEGER,
    "closedByAccountId" INTEGER,
    "descontoManualValor" DECIMAL(10,2),
    "descontoManualMotivo" TEXT,
    "descontoManualPor" INTEGER,
    "taxaServico" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPago" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "tabId" INTEGER NOT NULL,
    "metodo" "TabPaymentMethod" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "trocoEm" DECIMAL(10,2),
    "status" "TabPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "pixTransactionId" TEXT,
    "pixEndToEndId" TEXT,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "appliesToOrderItemIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recebidoPor" INTEGER,
    "recebidoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tab_publicId_key" ON "Tab"("publicId");

-- CreateIndex
CREATE INDEX "Tab_restaurantId_status_idx" ON "Tab"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Tab_tableId_idx" ON "Tab"("tableId");

-- CreateIndex
CREATE INDEX "Tab_numeroComandaFisica_idx" ON "Tab"("numeroComandaFisica");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_publicId_key" ON "Payment"("publicId");

-- CreateIndex
CREATE INDEX "Payment_tabId_idx" ON "Payment"("tabId");

-- CreateIndex
CREATE INDEX "Payment_restaurantId_status_idx" ON "Payment"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Order_tabId_idx" ON "Order"("tabId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
