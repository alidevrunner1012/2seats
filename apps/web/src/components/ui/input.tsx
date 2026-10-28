'use client';

import { motion } from 'framer-motion';
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { pressable, springs } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, label, ...props },
  ref,
): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <motion.div
      className="relative"
      variants={pressable}
      initial="idle"
      whileFocus={{ scale: 1.005 }}
      transition={springs.soft}
    >
      <input
        ref={ref}
        id={inputId}
        placeholder=" "
        className={cn(
          'peer min-h-14 w-full rounded-2xl border border-rose/20 bg-midnight/60 px-4 pb-2 pt-6 text-cream outline-none transition-all placeholder:text-transparent hover:border-blush/35 focus:border-rose focus:ring-2 focus:ring-rose/25 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-2 origin-left text-[11px] font-medium text-blush/80 transition-all peer-placeholder-shown:top-[19px] peer-placeholder-shown:text-sm peer-placeholder-shown:text-cream/45 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-blush"
      >
        {label}
      </label>
    </motion.div>
  );
});
