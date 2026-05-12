-- DropForeignKey
ALTER TABLE "RestaurantTeamMember" DROP CONSTRAINT "RestaurantTeamMember_userId_fkey";

-- DropTable
DROP TABLE "RestaurantTeamMember";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "TeamMemberRole";

-- DropEnum
DROP TYPE "UserRole";
