-- AlterTable
ALTER TABLE "Order" DROP COLUMN "externalPaymentId",
DROP COLUMN "paidAt",
DROP COLUMN "paymentMethod",
DROP COLUMN "paymentStatus",
DROP COLUMN "pixCopyPaste",
DROP COLUMN "pixQrCode";

-- DropEnum
DROP TYPE "PaymentStatus";
