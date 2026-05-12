-- CreateTable
CREATE TABLE "Audience" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "filtros" JSONB NOT NULL,
    "estimatedSize" INTEGER NOT NULL DEFAULT 0,
    "lastEstimateAt" TIMESTAMP(3),
    "createdByAccountId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audience_restaurantId_deletedAt_idx" ON "Audience"("restaurantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Audience_createdByAccountId_idx" ON "Audience"("createdByAccountId");

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
