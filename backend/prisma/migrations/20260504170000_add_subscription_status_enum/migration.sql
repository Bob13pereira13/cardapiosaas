DO $$
BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'OVERDUE', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
ALTER COLUMN "subscriptionStatus" DROP DEFAULT;

ALTER TABLE "User"
ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus"
USING "subscriptionStatus"::"SubscriptionStatus";

ALTER TABLE "User"
ALTER COLUMN "subscriptionStatus" SET DEFAULT 'TRIAL';
