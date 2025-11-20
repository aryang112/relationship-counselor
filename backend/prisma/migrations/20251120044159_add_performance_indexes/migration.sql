-- CreateIndex
CREATE INDEX "interviews_session_id_idx" ON "interviews"("session_id");

-- CreateIndex
CREATE INDEX "interviews_user_id_idx" ON "interviews"("user_id");

-- CreateIndex
CREATE INDEX "sessions_couple_id_idx" ON "sessions"("couple_id");
