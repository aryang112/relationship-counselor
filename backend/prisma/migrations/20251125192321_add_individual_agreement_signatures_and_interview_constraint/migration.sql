-- AlterTable: Add individual agreement signature tracking for each partner
ALTER TABLE "couples" ADD COLUMN "user_a_signed_at" TIMESTAMP(3);
ALTER TABLE "couples" ADD COLUMN "user_b_signed_at" TIMESTAMP(3);

-- Data Migration: Backfill existing agreement data
-- If a couple had signed the agreement (old field), assume both partners signed at that time
UPDATE "couples"
SET "user_a_signed_at" = "agreement_signed_at",
    "user_b_signed_at" = "agreement_signed_at"
WHERE "agreement_signed_at" IS NOT NULL;

-- AlterTable: Remove old single agreement timestamp (deprecated)
ALTER TABLE "couples" DROP COLUMN IF EXISTS "agreement_signed_at";

-- CreateIndex: Ensure one interview per user per session
CREATE UNIQUE INDEX "interviews_session_id_user_id_key" ON "interviews"("session_id", "user_id");
