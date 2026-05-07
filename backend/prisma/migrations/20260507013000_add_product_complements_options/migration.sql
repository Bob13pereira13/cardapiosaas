ALTER TABLE "OptionGroup" ADD COLUMN "userId" INTEGER;
ALTER TABLE "OptionGroup" ADD COLUMN "descricao" TEXT;
ALTER TABLE "OptionGroup" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OptionGroup" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "OptionGroup" og
SET "userId" = p."userId"
FROM "Product" p
WHERE og."productId" = p."id";

ALTER TABLE "OptionGroup" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "OptionGroup" ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "Option" ADD COLUMN "descricao" TEXT;
ALTER TABLE "Option" ADD COLUMN "imagem" TEXT;
ALTER TABLE "Option" ADD COLUMN "estoque" INTEGER;
ALTER TABLE "Option" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Option" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "ProductComplement" (
    "productId" INTEGER NOT NULL,
    "optionGroupId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductComplement_pkey" PRIMARY KEY ("productId","optionGroupId")
);

INSERT INTO "ProductComplement" ("productId", "optionGroupId", "ordem")
SELECT "productId", "id", "displayOrder"
FROM "OptionGroup"
WHERE "productId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "OptionGroup_userId_ativo_idx" ON "OptionGroup"("userId", "ativo");
CREATE INDEX "ProductComplement_optionGroupId_idx" ON "ProductComplement"("optionGroupId");

ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductComplement" ADD CONSTRAINT "ProductComplement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductComplement" ADD CONSTRAINT "ProductComplement_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Option" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "OptionGroup" ALTER COLUMN "updatedAt" DROP DEFAULT;
