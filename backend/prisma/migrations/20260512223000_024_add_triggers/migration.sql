-- Migration 024: Fase F triggers schema

-- 1. Customer new fields
ALTER TABLE "Customer"
  ADD COLUMN "dataNascimento" TIMESTAMP(3),
  ADD COLUMN "firstOrderTriggered" BOOLEAN NOT NULL DEFAULT false;

-- 2. TriggerType enum
CREATE TYPE "TriggerType" AS ENUM (
  'BIRTHDAY',
  'NO_ORDER_X_DAYS',
  'FIRST_ORDER_ANNIVERSARY',
  'FIRST_ORDER_PLACED',
  'FIADO_LIMIT_NEAR'
);

-- 3. TriggerSubscription table
CREATE TABLE "TriggerSubscription" (
  "id"            SERIAL PRIMARY KEY,
  "restaurantId"  INTEGER NOT NULL,
  "campaignId"    INTEGER NOT NULL,
  "triggerType"   "TriggerType" NOT NULL,
  "triggerConfig" JSONB NOT NULL DEFAULT '{}',
  "ativo"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TriggerSubscription_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT "TriggerSubscription_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE
);

-- 4. Unique constraint (uma subscription por campaignId+triggerType)
ALTER TABLE "TriggerSubscription"
  ADD CONSTRAINT "TriggerSubscription_campaignId_triggerType_key"
  UNIQUE ("campaignId", "triggerType");

-- 5. Indexes
CREATE INDEX "TriggerSubscription_restaurantId_idx" ON "TriggerSubscription"("restaurantId");
CREATE INDEX "TriggerSubscription_campaignId_idx" ON "TriggerSubscription"("campaignId");
CREATE INDEX "TriggerSubscription_ativo_idx" ON "TriggerSubscription"("ativo");

-- 6. Backfill: mark existing customers whose first order was > 24h ago
--    so the FIRST_ORDER_PLACED trigger doesn't fire retroactively
UPDATE "Customer"
SET "firstOrderTriggered" = true
WHERE "firstOrderAt" IS NOT NULL
  AND "firstOrderAt" < NOW() - INTERVAL '24 hours';
