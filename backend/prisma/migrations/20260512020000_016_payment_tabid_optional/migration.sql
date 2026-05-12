-- Migration 016: make Payment.tabId nullable to support standalone fiado payments
-- Fiado quitação payments are not linked to a specific Tab

ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tabId_fkey";

ALTER TABLE "Payment" ALTER COLUMN "tabId" DROP NOT NULL;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_tabId_fkey"
  FOREIGN KEY ("tabId") REFERENCES "Tab"("id")
  ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
