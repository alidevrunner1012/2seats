import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/features/brand/Logo';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}): JSX.Element {
  return (
    <main className="grid min-h-[100svh] place-items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          aria-label="2Seats home"
          className="mx-auto mb-8 flex w-fit rounded-xl focus-visible:ring-2 focus-visible:ring-rose"
        >
          <Logo size="md" layoutId="2seats-brand-logo" />
        </Link>
        <section className="glass rounded-[2rem] p-6 shadow-rose sm:p-9">
          <p className="text-center text-xs uppercase tracking-[0.24em] text-blush/70">
            {eyebrow}
          </p>
          <h1 className="type-display-page mt-3 text-center text-cream">
            {title}
          </h1>
          <p className="mx-auto mb-7 mt-3 max-w-sm text-center text-sm leading-6 text-cream/60">
            {description}
          </p>
          {children}
          <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-cream/55">
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
