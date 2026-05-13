-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderOrigin" ADD VALUE 'MESA';
ALTER TYPE "OrderOrigin" ADD VALUE 'NINETYNINEFOOD';
ALTER TYPE "OrderOrigin" ADD VALUE 'KEETA';

-- DropForeignKey
ALTER TABLE "TriggerSubscription" DROP CONSTRAINT "TriggerSubscription_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "TriggerSubscription" DROP CONSTRAINT "TriggerSubscription_restaurantId_fkey";

-- AlterTable
ALTER TABLE "TriggerSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "TriggerSubscription" ADD CONSTRAINT "TriggerSubscription_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerSubscription" ADD CONSTRAINT "TriggerSubscription_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
