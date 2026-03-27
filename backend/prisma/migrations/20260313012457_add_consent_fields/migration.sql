-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consent_agreed_at" TIMESTAMP(3),
ADD COLUMN     "date_of_birth_confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_minor_flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacy_version_agreed" VARCHAR(10),
ADD COLUMN     "tos_version_agreed" VARCHAR(10);

-- CreateTable
CREATE TABLE "consent_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tos_version" VARCHAR(10) NOT NULL,
    "privacy_version" VARCHAR(10) NOT NULL,
    "agreed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_version" VARCHAR(20),
    "platform" VARCHAR(10),

    CONSTRAINT "consent_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_log_user_id_idx" ON "consent_log"("user_id");

-- AddForeignKey
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
