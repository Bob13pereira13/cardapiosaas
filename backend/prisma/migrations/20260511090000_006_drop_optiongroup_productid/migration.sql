-- DropForeignKey
ALTER TABLE "OptionGroup" DROP CONSTRAINT "OptionGroup_productId_fkey";

-- AlterTable
ALTER TABLE "OptionGroup" DROP COLUMN "productId";
