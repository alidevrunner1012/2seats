'use client';

import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { hoverLift, pressable } from '@/lib/motion';
import { cn } from '@/lib/utils';

const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-rose text-white shadow-rose hover:bg-[#f05a7b] hover:shadow-[0_0_38px_rgb(232_70_108_/_0.38)]',
        ghost: 'bg-transparent text-cream/80 hover:bg-white/5 hover:text-cream',
        glass: 'glass text-cream hover:border-blush/40 hover:bg-white/10',
      },
      size: {
        default: 'min-h-11 px-5',
        sm: 'min-h-9 px-4 text-xs',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | 'onAnimationStart'
      | 'onAnimationEnd'
      | 'onDrag'
      | 'onDragStart'
      | 'onDragEnd'
    >,
    VariantProps<typeof buttonStyles> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, type = 'button', ...props },
    ref,
  ): JSX.Element {
    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(buttonStyles({ variant, size }), className)}
        variants={{ ...pressable, ...hoverLift }}
        initial="idle"
        whileHover="hover"
        whileTap="press"
        animate="idle"
        whileFocus="hover"
        {...props}
      />
    );
  },
);
