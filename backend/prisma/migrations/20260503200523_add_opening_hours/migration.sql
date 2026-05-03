-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aberto" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "horarioAbertura" TEXT,
ADD COLUMN     "horarioFechamento" TEXT;
