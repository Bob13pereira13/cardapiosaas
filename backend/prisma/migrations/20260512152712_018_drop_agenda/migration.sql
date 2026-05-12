-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_restaurantId_fkey";

-- DropTable
DROP TABLE "Agendamento";

-- DropEnum
DROP TYPE "AgendamentoStatus";

-- DropEnum
DROP TYPE "AgendamentoTipo";
