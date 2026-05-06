-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "ativa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "icone" TEXT;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "limitePorCliente" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "emDestaque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estoque" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precoPromocional" DOUBLE PRECISION,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "tempoPreparo" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bairrosAtendidos" JSONB,
ADD COLUMN     "emailSuporte" TEXT,
ADD COLUMN     "mensagemEntrega" TEXT,
ADD COLUMN     "mensagemFechado" TEXT,
ADD COLUMN     "nomePlataforma" TEXT,
ADD COLUMN     "pausaAbertura" TEXT,
ADD COLUMN     "pausaAtiva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pausaFechamento" TEXT,
ADD COLUMN     "urlPublica" TEXT,
ADD COLUMN     "whatsappSuporte" TEXT,
ADD COLUMN     "wppEnvioAutomatico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wppMsgConfirmado" TEXT,
ADD COLUMN     "wppMsgPedido" TEXT,
ADD COLUMN     "wppMsgPronto" TEXT,
ADD COLUMN     "wppMsgSaiu" TEXT;
