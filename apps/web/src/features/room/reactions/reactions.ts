export const REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Send a heart' },
  { id: 'popcorn', emoji: '🍿', label: 'Send popcorn' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'cry', emoji: '😭', label: 'Cry' },
] as const;
export type ReactionId = (typeof REACTIONS)[number]['id'];
export const emojiFor = (id: string) => REACTIONS.find((r) => r.id === id)?.emoji ?? '❤️';

/** Allow one reaction per `gapMs`; returns a function that says whether this press may go through. */
export function makeThrottle(gapMs: number, now: () => number = Date.now) {
  let last = -Infinity;
  return () => { const t = now(); if (t - last < gapMs) return false; last = t; return true; };
}
/** Keep the newest `max` items so a spam storm cannot flood the DOM. */
export const capList = <T,>(list: T[], item: T, max = 30): T[] => [...list, item].slice(-max);
