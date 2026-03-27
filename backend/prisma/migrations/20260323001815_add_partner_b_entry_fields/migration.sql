-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "partner_a_extraction" JSONB,
ADD COLUMN     "partner_b_snoozed_until" TIMESTAMP(3),
ADD COLUMN     "topic_tag" VARCHAR(50),
ADD COLUMN     "topic_tag_generated_at" TIMESTAMP(3);
