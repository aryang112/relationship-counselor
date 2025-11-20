-- DropForeignKey
ALTER TABLE "couples" DROP CONSTRAINT "couples_user_b_id_fkey";

-- AlterTable
ALTER TABLE "couples" ALTER COLUMN "user_b_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "couples" ADD CONSTRAINT "couples_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
