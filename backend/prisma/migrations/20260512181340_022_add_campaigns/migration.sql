-- CreateEnum
CREATE TYPE "CampaignTipo" AS ENUM ('CUPOM_UNICO', 'CUPOM_GENERICO', 'MENSAGEM');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgendamentoTipo" AS ENUM ('IMMEDIATE', 'SCHEDULED', 'RECURRING', 'TRIGGER');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CONVERTED');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "CampaignTipo" NOT NULL,
    "channel" "CampaignChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "agendamentoTipo" "AgendamentoTipo" NOT NULL DEFAULT 'IMMEDIATE',
    "scheduledAt" TIMESTAMP(3),
    "recurringCron" TEXT,
    "recurringEndsAt" TIMESTAMP(3),
    "audienceId" INTEGER,
    "couponId" INTEGER,
    "templateBody" TEXT NOT NULL,
    "statsTotal" INTEGER NOT NULL DEFAULT 0,
    "statsSent" INTEGER NOT NULL DEFAULT 0,
    "statsFailed" INTEGER NOT NULL DEFAULT 0,
    "statsDelivered" INTEGER NOT NULL DEFAULT 0,
    "statsRead" INTEGER NOT NULL DEFAULT 0,
    "statsConverted" INTEGER NOT NULL DEFAULT 0,
    "createdByAccountId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignDispatch" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMessage" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "couponId" INTEGER,
    "orderId" INTEGER,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "zapiMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_restaurantId_status_idx" ON "Campaign"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Campaign_audienceId_idx" ON "Campaign"("audienceId");

-- CreateIndex
CREATE INDEX "Campaign_createdByAccountId_idx" ON "Campaign"("createdByAccountId");

-- CreateIndex
CREATE INDEX "Campaign_couponId_idx" ON "Campaign"("couponId");

-- CreateIndex
CREATE INDEX "CampaignDispatch_campaignId_status_idx" ON "CampaignDispatch"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignDispatch_scheduledAt_idx" ON "CampaignDispatch"("scheduledAt");

-- CreateIndex
CREATE INDEX "CampaignMessage_dispatchId_status_idx" ON "CampaignMessage"("dispatchId", "status");

-- CreateIndex
CREATE INDEX "CampaignMessage_customerId_idx" ON "CampaignMessage"("customerId");

-- CreateIndex
CREATE INDEX "CampaignMessage_couponId_idx" ON "CampaignMessage"("couponId");

-- CreateIndex
CREATE INDEX "CampaignMessage_zapiMessageId_idx" ON "CampaignMessage"("zapiMessageId");

-- CreateIndex
CREATE INDEX "CampaignMessage_orderId_idx" ON "CampaignMessage"("orderId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDispatch" ADD CONSTRAINT "CampaignDispatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "CampaignDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
