import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { MAIL_QUEUE, type MailJob } from './mail.types';

@Injectable()
export class MailService {
  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue<MailJob>,
  ) {}

  async sendAccountEmail(email: MailJob): Promise<void> {
    await this.queue.add('account-email', email, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    });
  }
}
