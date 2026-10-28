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
    return isPrivateIpv4(address);
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    const mappedIpv4 = mappedIpv4Address(normalized);
    if (mappedIpv4 !== null) return isPrivateIpv4(mappedIpv4);
    return normalized === '::' || normalized === '::1' ||
      normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe80:') || normalized.startsWith('ff');
  }
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  const first = parts[0];
  const second = parts[1];
  return parts.length !== 4 || first === undefined || second === undefined ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255) ||
    first === 0 || first === 10 || first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 198 && second >= 18 && second <= 19) ||
    first >= 224;
}

function mappedIpv4Address(address: string): string | null {
  const marker = address.lastIndexOf('::ffff:');
  if (marker !== 0) return null;
  const suffix = address.slice(7);
  if (net.isIPv4(suffix)) return suffix;
  const hexParts = suffix.split(':');
  if (hexParts.length === 2 && hexParts.every((part) => /^[\da-f]{1,4}$/i.test(part))) {
    return mappedIpv4FromValue(
      (Number.parseInt(hexParts[0]!, 16) << 16) | Number.parseInt(hexParts[1]!, 16),
    );
  }
  if (!/^[\da-f]{1,8}$/i.test(suffix)) return null;
  const value = Number.parseInt(suffix, 16);
  return mappedIpv4FromValue(value);
}

function mappedIpv4FromValue(value: number): string {
  return `${value >>> 24}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
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
