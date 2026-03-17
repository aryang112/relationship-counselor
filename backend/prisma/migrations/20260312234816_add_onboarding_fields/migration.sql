-- AlterTable
ALTER TABLE "couples" ADD COLUMN     "dating_start_date" TEXT,
ADD COLUMN     "onboarding_data" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "onboarding_data" JSONB;
