-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resolved_session_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revenuecat_id" VARCHAR(100),
ADD COLUMN     "subscription_expires_at" TIMESTAMP(3),
ADD COLUMN     "subscription_tier" VARCHAR(20) NOT NULL DEFAULT 'free';
