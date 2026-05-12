-- CreateTable
CREATE TABLE "ProductAvailability" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAvailability_productId_dayOfWeek_idx" ON "ProductAvailability"("productId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAvailability_productId_dayOfWeek_startTime_endTime_key" ON "ProductAvailability"("productId", "dayOfWeek", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "ProductAvailability" ADD CONSTRAINT "ProductAvailability_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
