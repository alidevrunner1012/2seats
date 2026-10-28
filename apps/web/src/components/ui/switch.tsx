'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { pressable } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function Switch(
  props: ComponentProps<typeof SwitchPrimitive.Root>,
): JSX.Element {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'group inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-rose/25 bg-white/10 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-rose data-[state=checked]:bg-rose',
        props.className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          className="pointer-events-none block size-5 rounded-full bg-cream shadow-sm transition-[transform,background-color] duration-200 group-data-[state=checked]:translate-x-5 group-data-[state=checked]:bg-white"
          variants={pressable}
          initial="idle"
          whileTap="press"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
