-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productionSectorId" INTEGER;

-- CreateTable
CREATE TABLE "ProductionSector" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionSector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSector_publicId_key" ON "ProductionSector"("publicId");

-- CreateIndex
CREATE INDEX "ProductionSector_restaurantId_ativo_idx" ON "ProductionSector"("restaurantId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSector_restaurantId_nome_key" ON "ProductionSector"("restaurantId", "nome");

-- CreateIndex
CREATE INDEX "Product_productionSectorId_idx" ON "Product"("productionSectorId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productionSectorId_fkey" FOREIGN KEY ("productionSectorId") REFERENCES "ProductionSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionSector" ADD CONSTRAINT "ProductionSector_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
