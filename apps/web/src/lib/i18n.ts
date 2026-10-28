export type Locale = 'en' | 'hi';
export type MessageKey =
  | 'tagline'
  | 'welcome'
  | 'startDate'
  | 'yourSeat'
  | 'partnerSeat'
  | 'oops'
  | 'tryAgain';

const messages: Record<Locale, Record<MessageKey, string>> = {
  en: {
    tagline: 'Your seat is always next to mine.',
    welcome: 'A little movie magic, just for two.',
    startDate: 'Plan a movie date',
    yourSeat: 'Your seat',
    partnerSeat: 'Their seat',
    oops: 'Oops, the reel snapped.',
    tryAgain: 'Try again',
  },
  hi: {
    tagline: 'Meri seat hamesha tumhare paas hai.',
    welcome: 'Sirf tum dono ke liye, thoda sa movie magic.',
    startDate: 'Movie date plan karein',
    yourSeat: 'Aapki seat',
    partnerSeat: 'Unki seat',
    oops: 'Oops, reel toot gayi.',
    tryAgain: 'Phir se koshish karein',
  },
};

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
