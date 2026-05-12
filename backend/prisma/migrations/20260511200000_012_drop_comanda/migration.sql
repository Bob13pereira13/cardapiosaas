-- DropForeignKey
ALTER TABLE "Comanda" DROP CONSTRAINT "Comanda_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Comanda" DROP CONSTRAINT "Comanda_tableId_fkey";

-- DropForeignKey
ALTER TABLE "ComandaItem" DROP CONSTRAINT "ComandaItem_comandaId_fkey";

-- DropForeignKey
ALTER TABLE "ComandaItem" DROP CONSTRAINT "ComandaItem_productId_fkey";

-- DropTable
DROP TABLE "Comanda";

-- DropTable
DROP TABLE "ComandaItem";

-- DropEnum
DROP TYPE "ComandaStatus";
