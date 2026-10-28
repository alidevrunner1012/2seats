// Starter list only. Load a real, localized list (en/hi/hinglish) from env or a file in production.
const DEFAULT = (process.env.PROFANITY_WORDS ?? 'damn,shit,fuck,bastard').split(',').map((w) => w.trim()).filter(Boolean);
const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function filterProfanity(text: string, words: string[] = DEFAULT): string {
  if (!words.length) return text;
  const re = new RegExp(`\\b(${words.map(esc).join('|')})\\b`, 'gi');
  return text.replace(re, (m) => '*'.repeat(m.length));
}
