-- CreateTable
CREATE TABLE "unpackings" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "surface_conflict" TEXT NOT NULL,
    "partner_a_experience" TEXT NOT NULL,
    "partner_b_experience" TEXT NOT NULL,
    "shared_truths" JSONB NOT NULL,
    "deeper_insight" TEXT NOT NULL,
    "pattern_recognition" TEXT,
    "tone" TEXT NOT NULL,
    "feedback_count" INTEGER NOT NULL DEFAULT 0,
    "last_feedback_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unpackings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unpackings_session_id_key" ON "unpackings"("session_id");

-- CreateIndex
CREATE INDEX "unpackings_session_id_idx" ON "unpackings"("session_id");

-- AddForeignKey
ALTER TABLE "unpackings" ADD CONSTRAINT "unpackings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
