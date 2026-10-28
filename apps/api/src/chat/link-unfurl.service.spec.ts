import dns from 'node:dns/promises';
import { LinkUnfurlService } from './link-unfurl.service';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));
jest.mock('node:http', () => ({ request: jest.fn() }));
jest.mock('node:https', () => ({ request: jest.fn() }));

describe('LinkUnfurlService', () => {
  it.each(['127.0.0.1', '169.254.169.254', '10.0.0.5'])(
    'blocks private target %s',
    async (hostname) => {
      jest.mocked(dns.lookup).mockResolvedValue([{ address: hostname, family: 4 }] as never);
      await expect(new LinkUnfurlService().fetch(`https://${hostname}/`)).rejects.toThrow('Private');
    },
  );

  it.each(['::ffff:169.254.169.254', '::ffff:a9fe:a9fe', '::ffff:127.0.0.1'])(
    'blocks IPv4-mapped private target %s',
    async (hostname) => {
      jest.mocked(dns.lookup).mockResolvedValue([{ address: hostname, family: 6 }] as never);
      await expect(new LinkUnfurlService().fetch(`https://[${hostname}]/`)).rejects.toThrow('Private');
    },
  );

  it('blocks DNS rebinding when any resolved address is private', async () => {
    jest.mocked(dns.lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ] as never);
    await expect(new LinkUnfurlService().fetch('https://example.test/')).rejects.toThrow('Private');
  });

  it('pins the validated address instead of resolving the hostname again', async () => {
    const request = jest.mocked((await import('node:https')).request);
    jest.mocked(dns.lookup).mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    request.mockImplementation((_options, callback) => {
      const response = {
        statusCode: 200,
        headers: { 'content-length': '25' },
        on: (event: string, handler: (chunk?: Buffer) => void) => {
          if (event === 'data') handler(Buffer.from('<title>Safe</title>'));
          if (event === 'end') handler();
          return response;
        },
      };
      const onResponse = callback as unknown as (value: unknown) => void;
      onResponse(response);
      return {
        on: () => undefined,
        end: () => undefined,
        destroy: () => undefined,
      } as never;
    });
    await expect(new LinkUnfurlService().fetch('https://example.test/')).resolves.toMatchObject({ title: 'Safe' });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ hostname: '93.184.216.34' }), expect.any(Function));
  });
});
