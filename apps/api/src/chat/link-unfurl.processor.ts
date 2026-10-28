import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { LinkUnfurlService } from './link-unfurl.service';
import { LINK_UNFURL_QUEUE, type LinkUnfurlJob } from './link-unfurl.types';

@Processor(LINK_UNFURL_QUEUE)
@Injectable()
export class LinkUnfurlProcessor extends WorkerHost {
  private readonly logger = new Logger(LinkUnfurlProcessor.name);

  constructor(
    private readonly unfurl: LinkUnfurlService,
    private readonly chat: ChatService,
  ) {
    super();
  }

  async process(job: Job<LinkUnfurlJob>): Promise<void> {
    try {
      const metadata = await this.unfurl.fetch(job.data.url);
      await this.chat.updateLinkMetadata(job.data.messageId, metadata);
    } catch (error) {
      this.logger.warn(`Link unfurl failed for message ${job.data.messageId}: ${String(error)}`);
    }
  }
}
