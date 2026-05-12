-- AlterEnum — OrderOrigin: remove RAPPI_99 e UBER_EATS (mantém WHATSAPP_BOT)
BEGIN;
CREATE TYPE "OrderOrigin_new" AS ENUM ('WEBSITE', 'MANUAL', 'WHATSAPP_BOT', 'IFOOD', 'OTHER');
ALTER TABLE "public"."Order" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "origin" TYPE "OrderOrigin_new" USING ("origin"::text::"OrderOrigin_new");
ALTER TYPE "OrderOrigin" RENAME TO "OrderOrigin_old";
ALTER TYPE "OrderOrigin_new" RENAME TO "OrderOrigin";
DROP TYPE "public"."OrderOrigin_old";
ALTER TABLE "Order" ALTER COLUMN "origin" SET DEFAULT 'WEBSITE';
COMMIT;

-- AlterEnum — TabPaymentMethod: remove VOUCHER_REFEICAO e CORTESIA
BEGIN;
CREATE TYPE "TabPaymentMethod_new" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'FIADO');
ALTER TABLE "Payment" ALTER COLUMN "metodo" TYPE "TabPaymentMethod_new" USING ("metodo"::text::"TabPaymentMethod_new");
ALTER TYPE "TabPaymentMethod" RENAME TO "TabPaymentMethod_old";
ALTER TYPE "TabPaymentMethod_new" RENAME TO "TabPaymentMethod";
DROP TYPE "public"."TabPaymentMethod_old";
COMMIT;

-- DropIndex
DROP INDEX "Order_source_restaurantId_idx";

-- AlterTable — remove Order.source column
ALTER TABLE "Order" DROP COLUMN "source";

-- DropEnum — OrderSource inteiro
DROP TYPE "OrderSource";
