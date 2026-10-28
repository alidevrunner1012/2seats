import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UploadsService } from './uploads.service';

@Injectable()
export class UploadsCleanup {
  private readonly log = new Logger(UploadsCleanup.name);
  constructor(private readonly uploads: UploadsService) {}
  @Cron(CronExpression.EVERY_30_MINUTES)
  async run() {
    const n = await this.uploads.cleanupPending();
    if (n) this.log.log(`Removed ${n} stale pending uploads`);
  }
}
