-- LiveKit screen-share permission is controlled per room.
ALTER TABLE "Room"
  ADD COLUMN "screenShareEnabled" BOOLEAN NOT NULL DEFAULT true;
