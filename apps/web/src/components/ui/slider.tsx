'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { pressable } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function Slider(
  props: ComponentProps<typeof SliderPrimitive.Root>,
): JSX.Element {
  const { 'aria-label': ariaLabel, ...rootProps } = props;

  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-midnight',
        props.className,
      )}
      {...rootProps}
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-rose to-blush" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb asChild>
        <motion.span
          aria-label={ariaLabel}
          className="block size-4 rounded-full border-2 border-cream bg-rose shadow-rose transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush"
          variants={pressable}
          initial="idle"
          whileTap="press"
        />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}
