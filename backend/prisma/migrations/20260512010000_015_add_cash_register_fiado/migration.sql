-- CreateEnum
CREATE TYPE "CashRegisterSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "CashMovementOrigin" AS ENUM ('PAYMENT_CASH', 'FIADO_QUITACAO', 'MANUAL_SUPRIMENTO', 'MANUAL_SANGRIA');

-- CreateEnum
CREATE TYPE "FiadoTransactionType" AS ENUM ('DEBITO', 'CREDITO');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "fiadoLimite" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fiadoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cashRegisterSessionId" INTEGER;

-- CreateTable
CREATE TABLE "CashRegisterSession" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "openedByAccountId" INTEGER NOT NULL,
    "closedByAccountId" INTEGER,
    "name" TEXT,
    "status" "CashRegisterSessionStatus" NOT NULL DEFAULT 'OPEN',
    "valorInicial" DECIMAL(10,2) NOT NULL,
    "valorEsperado" DECIMAL(10,2),
    "valorContado" DECIMAL(10,2),
    "diferenca" DECIMAL(10,2),
    "observacaoAbertura" TEXT,
    "observacaoFechamento" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "cashRegisterSessionId" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "createdByAccountId" INTEGER NOT NULL,
    "tipo" "CashMovementType" NOT NULL,
    "origem" "CashMovementOrigin" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiadoTransaction" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "tabId" INTEGER,
    "paymentId" INTEGER,
    "createdByAccountId" INTEGER NOT NULL,
    "tipo" "FiadoTransactionType" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "saldoAposTransacao" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiadoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashRegisterSession_restaurantId_status_idx" ON "CashRegisterSession"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "CashRegisterSession_restaurantId_openedByAccountId_idx" ON "CashRegisterSession"("restaurantId", "openedByAccountId");

-- CreateIndex
CREATE INDEX "CashMovement_cashRegisterSessionId_idx" ON "CashMovement"("cashRegisterSessionId");

-- CreateIndex
CREATE INDEX "CashMovement_restaurantId_idx" ON "CashMovement"("restaurantId");

-- CreateIndex
CREATE INDEX "CashMovement_paymentId_idx" ON "CashMovement"("paymentId");

-- CreateIndex
CREATE INDEX "FiadoTransaction_restaurantId_customerId_idx" ON "FiadoTransaction"("restaurantId", "customerId");

-- CreateIndex
CREATE INDEX "FiadoTransaction_customerId_idx" ON "FiadoTransaction"("customerId");

-- CreateIndex
CREATE INDEX "FiadoTransaction_tabId_idx" ON "FiadoTransaction"("tabId");

-- CreateIndex
CREATE INDEX "FiadoTransaction_paymentId_idx" ON "FiadoTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "Payment_cashRegisterSessionId_idx" ON "Payment"("cashRegisterSessionId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashRegisterSessionId_fkey" FOREIGN KEY ("cashRegisterSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_openedByAccountId_fkey" FOREIGN KEY ("openedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_closedByAccountId_fkey" FOREIGN KEY ("closedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashRegisterSessionId_fkey" FOREIGN KEY ("cashRegisterSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiadoTransaction" ADD CONSTRAINT "FiadoTransaction_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiadoTransaction" ADD CONSTRAINT "FiadoTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiadoTransaction" ADD CONSTRAINT "FiadoTransaction_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiadoTransaction" ADD CONSTRAINT "FiadoTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiadoTransaction" ADD CONSTRAINT "FiadoTransaction_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
