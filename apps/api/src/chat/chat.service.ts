import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { Message } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LINK_UNFURL_QUEUE, type LinkUnfurlJob } from './link-unfurl.types';

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export interface ChatMessageView {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

function toView(message: Message & { sender: { displayName: string } }): ChatMessageView {
  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    senderName: message.sender.displayName,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(LINK_UNFURL_QUEUE) private readonly linkQueue: Queue<LinkUnfurlJob>,
  ) {}

  async send(roomId: string, senderId: string, content: string): Promise<ChatMessageView> {
    const cleanContent = stripHtml(content).slice(0, 2_000);
    const url = cleanContent.match(/https?:\/\/[^\s]+/i)?.[0];
    const message = await this.prisma.message.create({
      data: { roomId, senderId, content: cleanContent, ...(url ? { linkUrl: url } : {}) },
      include: { sender: { select: { displayName: true } } },
    });
    if (url !== undefined) {
      await this.linkQueue.add('unfurl', { messageId: message.id, url }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: 500,
      });
    }
    return toView(message);
  }

  async updateLinkMetadata(messageId: string, metadata: { url: string; title: string | null; description: string | null; image: string | null }): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        linkUrl: metadata.url,
        linkTitle: metadata.title,
        linkDescription: metadata.description,
        linkImage: metadata.image,
      },
    });
  }

  async system(roomId: string, senderId: string, content: string): Promise<ChatMessageView> {
    const message = await this.prisma.message.create({
      data: { roomId, senderId, content: stripHtml(content).slice(0, 500) },
      include: { sender: { select: { displayName: true } } },
    });
    return toView(message);
  }

  async list(
    roomId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ChatMessageView[]; nextCursor: string | null }> {
    const messages = await this.prisma.message.findMany({
      where: { roomId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { sender: { select: { displayName: true } } },
    });
    const items = messages.slice(0, limit).map(toView);
    return {
      items,
      nextCursor: messages.length > limit ? items.at(-1)?.id ?? null : null,
    };
  }

  async react(messageId: string, userId: string, emoji: string): Promise<void> {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, deletedAt: null },
      select: { id: true },
    });
    if (message === null) throw new NotFoundException('Message is unavailable.');
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async delete(messageId: string, userId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: { id: messageId, senderId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
