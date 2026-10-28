import { Heart } from 'lucide-react';
import Link from 'next/link';

export function BrandWordmark(): JSX.Element {
  return (
    <Link
      href="/"
      aria-label="2Seats home"
      className="group inline-flex items-center gap-2 rounded-lg text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-rose/15 text-rose transition-all group-hover:bg-rose/25 group-hover:shadow-rose">
        <Heart
          className="size-4 fill-current transition-transform group-hover:scale-110"
          aria-hidden="true"
        />
      </span>
      <span className="font-display text-xl tracking-tight">2Seats</span>
    </Link>
  );
}
