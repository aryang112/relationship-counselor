-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "context" TEXT,
ADD COLUMN     "topic" TEXT;
