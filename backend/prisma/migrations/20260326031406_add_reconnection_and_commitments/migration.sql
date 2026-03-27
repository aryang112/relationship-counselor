-- CreateTable
CREATE TABLE "reconnection_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconnection_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_a_agreed" BOOLEAN NOT NULL DEFAULT false,
    "user_b_agreed" BOOLEAN NOT NULL DEFAULT false,
    "user_a_agreed_at" TIMESTAMP(3),
    "user_b_agreed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconnection_messages_session_id_created_at_idx" ON "reconnection_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "commitments_session_id_key" ON "commitments"("session_id");

-- AddForeignKey
ALTER TABLE "reconnection_messages" ADD CONSTRAINT "reconnection_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconnection_messages" ADD CONSTRAINT "reconnection_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
