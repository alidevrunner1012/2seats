ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "UploadStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "UploadStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
CREATE TYPE "BrowserSessionStatus" AS ENUM ('STARTING', 'RUNNING', 'STOPPED', 'EXPIRED', 'FAILED');

ALTER TABLE "BrowserSession" RENAME COLUMN "createdById" TO "userId";
ALTER TABLE "BrowserSession" DROP COLUMN "sessionKey";
ALTER TABLE "BrowserSession"
  ADD COLUMN "status" "BrowserSessionStatus" NOT NULL DEFAULT 'STARTING',
  ADD COLUMN "handle" TEXT,
  ADD COLUMN "slot" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "httpPort" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "endedAt" TIMESTAMP(3);

ALTER TABLE "Report" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "AuditLog" ADD COLUMN "targetId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE TABLE "TosAcceptance" (
  "userId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TosAcceptance_pkey" PRIMARY KEY ("userId", "version")
);

CREATE TABLE "DmcaTakedown" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "note" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DmcaTakedown_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DmcaTakedown_value_key" ON "DmcaTakedown"("value");
CREATE INDEX "BrowserSession_roomId_status_idx" ON "BrowserSession"("roomId", "status");
CREATE INDEX "BrowserSession_userId_status_idx" ON "BrowserSession"("userId", "status");
CREATE INDEX "BrowserSession_status_expiresAt_idx" ON "BrowserSession"("status", "expiresAt");
ALTER TABLE "BrowserSession" ADD CONSTRAINT "BrowserSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
