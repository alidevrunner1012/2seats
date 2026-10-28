import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate overflow-hidden rounded-xl bg-rose/[0.08] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-blush/[0.12] before:to-transparent motion-reduce:before:animate-none',
        className,
      )}
      {...props}
    />
  );
}
