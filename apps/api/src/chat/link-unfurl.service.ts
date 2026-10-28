import { Injectable } from '@nestjs/common';
import dns from 'node:dns/promises';
import net from 'node:net';

export interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] !== undefined && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }
  return true;
}

@Injectable()
export class LinkUnfurlService {
  async fetch(urlValue: string): Promise<LinkMetadata> {
    const url = new URL(urlValue);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS links can be unfurled');
    }
    const addresses = await dns.lookup(url.hostname, { all: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
      throw new Error('Private or local link targets are not allowed');
    }
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(3_000),
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    if (!response.ok || response.status >= 300 && response.status < 400) {
      throw new Error('Link could not be fetched safely');
    }
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > 1_048_576) throw new Error('Link response is too large');
    const html = (await response.text()).slice(0, 1_048_576);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? null;
    const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? null;
    return { url: url.toString(), title, description, image };
  }
}
