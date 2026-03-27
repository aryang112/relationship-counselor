-- Add unpacking state tracking to sessions
ALTER TABLE "sessions"
  ADD COLUMN "unpacking_ready_at" TIMESTAMP(3),
  ADD COLUMN "unpacking_auto_unlock_at" TIMESTAMP(3),
  ADD COLUMN "unpacking_wait_user_a" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "unpacking_wait_user_b" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing sessions: no unpacking yet, leave defaults/nulls
