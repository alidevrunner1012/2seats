export interface TakedownEntry { kind: 'domain' | 'url'; value: string }
const stripHash = (u: string) => u.split('#')[0];

/** True if `url` is covered by any takedown entry. Domain entries also cover subdomains. */
export function urlMatchesTakedown(url: string, entries: TakedownEntry[]): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const href = stripHash(parsed.href);
  return entries.some((e) => {
    if (e.kind === 'url') {
      try { return stripHash(new URL(e.value).href) === href; } catch { return false; }
    }
    const d = e.value.toLowerCase().replace(/^\.+/, '');
    return host === d || host.endsWith(`.${d}`);
  });
}
