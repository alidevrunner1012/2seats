import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import type { Environment } from '../config/environment';

describe('RedisService', () => {
  it('disconnects an unconnected client safely during application shutdown', async () => {
    const config = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    } as unknown as ConfigService<Environment, true>;
    const service = new RedisService(config);
    const disconnect = jest.spyOn(service.client, 'disconnect');

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
