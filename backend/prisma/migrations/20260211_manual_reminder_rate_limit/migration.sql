-- Add manual reminder timestamp to sessions for rate limiting manual reminders
ALTER TABLE "sessions" ADD COLUMN "manual_reminder_sent_at" TIMESTAMP(3);
