-- CreateEnum
CREATE TYPE "OptionGroupTipo" AS ENUM ('COMPLEMENTO', 'OPCAO', 'ADICIONAL', 'VARIACAO');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'MANAGER', 'ATTENDANT', 'KITCHEN', 'CASHIER');

-- AlterEnum
ALTER TYPE "OptionPriceMode" ADD VALUE 'FIXED_TOTAL';

-- AlterTable
ALTER TABLE "OptionGroup" ADD COLUMN     "tipo" "OptionGroupTipo" NOT NULL DEFAULT 'ADICIONAL';

-- CreateTable
CREATE TABLE "RestaurantTeamMember" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "cargo" "TeamMemberRole" NOT NULL DEFAULT 'ATTENDANT',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantTeamMember_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RestaurantTeamMember" ADD CONSTRAINT "RestaurantTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
