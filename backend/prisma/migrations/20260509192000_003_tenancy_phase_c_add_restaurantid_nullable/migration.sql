-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "accountId" INTEGER,
ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "CartAbandonment" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Comanda" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Combo" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "CustomerAuth" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "LoyaltyPoints" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "LoyaltyTransaction" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "NpsResponse" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "OptionGroup" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "restaurantId" INTEGER;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "restaurantId" INTEGER;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAuth" ADD CONSTRAINT "CustomerAuth_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPoints" ADD CONSTRAINT "LoyaltyPoints_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsResponse" ADD CONSTRAINT "NpsResponse_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartAbandonment" ADD CONSTRAINT "CartAbandonment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
