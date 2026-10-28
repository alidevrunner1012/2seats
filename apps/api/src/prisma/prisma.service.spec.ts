import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('disconnects Prisma during application shutdown', async () => {
    const service = new PrismaService();
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
