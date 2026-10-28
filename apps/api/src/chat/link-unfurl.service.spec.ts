import dns from 'node:dns/promises';
import { LinkUnfurlService } from './link-unfurl.service';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

describe('LinkUnfurlService', () => {
  it.each(['127.0.0.1', '169.254.169.254', '10.0.0.5'])(
    'blocks private target %s',
    async (hostname) => {
      jest.mocked(dns.lookup).mockResolvedValue([{ address: hostname, family: 4 }] as never);
      await expect(new LinkUnfurlService().fetch(`https://${hostname}/`)).rejects.toThrow('Private');
    },
  );

  it('blocks DNS rebinding when any resolved address is private', async () => {
    jest.mocked(dns.lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ] as never);
    await expect(new LinkUnfurlService().fetch('https://example.test/')).rejects.toThrow('Private');
  });
});
