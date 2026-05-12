-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENTUAL', 'VALOR_FIXO', 'PRECO_FIXO');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "appliedPromotionId" INTEGER,
ADD COLUMN     "precoOriginal" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PromotionalSchedule" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "productIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "categoryIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "tipoDesconto" "PromoDiscountType" NOT NULL,
    "valorDesconto" DOUBLE PRECISION NOT NULL,
    "validoDe" TIMESTAMP(3),
    "validoAte" TIMESTAMP(3),
    "diasSemana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionalSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromotionalSchedule_publicId_key" ON "PromotionalSchedule"("publicId");

-- CreateIndex
CREATE INDEX "PromotionalSchedule_restaurantId_ativo_idx" ON "PromotionalSchedule"("restaurantId", "ativo");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_appliedPromotionId_fkey" FOREIGN KEY ("appliedPromotionId") REFERENCES "PromotionalSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionalSchedule" ADD CONSTRAINT "PromotionalSchedule_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
