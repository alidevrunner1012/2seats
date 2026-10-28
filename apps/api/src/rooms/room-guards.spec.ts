import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { RoomHostGuard } from './room-host.guard';
import { RoomMemberGuard } from './room-member.guard';

function context(): ExecutionContext {
  const request = {
    params: { id: 'room-1' },
    user: { id: 'user-1' },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('room guards', () => {
  it('rejects non-members', async () => {
    const guard = new RoomMemberGuard({
      roomMember: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects participants from host actions', async () => {
    const guard = new RoomHostGuard({
      roomMember: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'membership' })
          .mockResolvedValueOnce({ role: 'PARTICIPANT' }),
      },
    } as unknown as PrismaService);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
