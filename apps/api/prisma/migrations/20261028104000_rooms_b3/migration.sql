-- B3 room lifecycle, scheduling, and playback settings
ALTER TYPE "RoomRole" RENAME VALUE 'MEMBER' TO 'PARTICIPANT';

ALTER TABLE "Room"
  ADD COLUMN "maxParticipants" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "everyoneCanControl" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Room_idempotencyKey_key" ON "Room"("idempotencyKey");
