import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeStyles = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        rose: 'border-rose/25 bg-rose/10 text-blush hover:bg-rose/15',
        amber: 'border-candle/25 bg-candle/10 text-candle hover:bg-candle/15',
        muted: 'border-white/10 bg-white/5 text-cream/65 hover:bg-white/10',
      },
    },
    defaultVariants: { variant: 'rose' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({
  className,
  variant,
  ...props
}: BadgeProps): JSX.Element {
  return (
    <span className={cn(badgeStyles({ variant }), className)} {...props} />
  );
}
