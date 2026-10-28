import type { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  it('strips HTML before persisting a message', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'message-1',
      roomId: 'room-1',
      senderId: 'user-1',
      content: 'hello world',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      sender: { displayName: 'Avery' },
    });
    const service = new ChatService(
      { message: { create } } as unknown as PrismaService,
      { add: jest.fn() } as never,
    );

    await expect(service.send('room-1', 'user-1', '<b>hello</b> world')).resolves.toMatchObject({
      content: 'hello world',
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: { roomId: 'room-1', senderId: 'user-1', content: 'hello world' },
    }));
  });
});
