export function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}
export const isExpiringSoon = (ms: number) => ms > 0 && ms < 5 * 60_000;
