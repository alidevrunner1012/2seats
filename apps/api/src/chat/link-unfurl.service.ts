import { Injectable } from '@nestjs/common';
import dns from 'node:dns/promises';
import http from 'node:http';
import net from 'node:net';
import https from 'node:https';

export interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return parts[0] === undefined || parts[1] === undefined ||
      parts[2] === undefined || parts[3] === undefined ||
      parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] !== undefined && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && (parts[1] === 168 || parts[1] === 0)) ||
      (parts[0] === 100 && parts[1] !== undefined && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 198 && parts[1] !== undefined && parts[1] >= 18 && parts[1] <= 19) ||
      parts[0] >= 224;
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.') ||
      normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe80:') || normalized.startsWith('ff');
  }
  return true;
}

const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REDIRECTS = 3;

interface ResponseData {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

@Injectable()
export class LinkUnfurlService {
  async fetch(urlValue: string): Promise<LinkMetadata> {
    let url = new URL(urlValue);
    let response: ResponseData | undefined;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      response = await this.request(url);
      if (response.statusCode < 300 || response.statusCode >= 400) break;
      const location = response.headers.location;
      if (location === undefined || redirects === MAX_REDIRECTS) {
        throw new Error('Link could not be fetched safely');
      }
      url = new URL(location, url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS links can be unfurled');
      }
    }
    if (response === undefined || response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error('Link could not be fetched safely');
    }
    const length = Number(response.headers['content-length']?.[0] ?? 0);
    if (length > MAX_RESPONSE_BYTES) throw new Error('Link response is too large');
    const html = response.body;
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? null;
    const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? null;
    return { url: url.toString(), title, description, image };
  }

  private async request(url: URL): Promise<ResponseData> {
    if (url.username !== '' || url.password !== '') {
      throw new Error('Credential-bearing links are not allowed');
    }
    const addresses = await dns.lookup(url.hostname, { all: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
      throw new Error('Private or local link targets are not allowed');
    }
    const address = addresses[0]?.address;
    if (address === undefined) throw new Error('Link target could not be resolved');
    const transport = url.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
      const request = transport.request({
        hostname: address,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { Accept: 'text/html,application/xhtml+xml', Host: url.host },
        servername: url.hostname,
        timeout: 3_000,
      }, (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size <= MAX_RESPONSE_BYTES) chunks.push(chunk);
          else request.destroy(new Error('Link response is too large'));
        });
        response.on('end', () => resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }));
        response.on('error', reject);
      });
      request.on('timeout', () => request.destroy(new Error('Link request timed out')));
      request.on('error', reject);
      request.end();
    });
  }
}
