-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "disponivel" BOOLEAN NOT NULL DEFAULT true;
