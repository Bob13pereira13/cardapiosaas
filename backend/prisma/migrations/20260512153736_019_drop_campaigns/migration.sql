-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_couponId_fkey";

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_restaurantId_fkey";

-- DropTable
DROP TABLE "Campaign";

-- DropEnum
DROP TYPE "CampaignStatus";

-- DropEnum
DROP TYPE "CampaignTipo";
