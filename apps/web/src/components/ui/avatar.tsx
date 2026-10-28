'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { hoverLift } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function Avatar(
  props: ComponentProps<typeof AvatarPrimitive.Root>,
): JSX.Element {
  return (
    <motion.div variants={hoverLift} initial="idle" whileHover="hover">
      <AvatarPrimitive.Root
        className={cn(
          'relative flex size-12 shrink-0 overflow-hidden rounded-full border border-rose/30 bg-wine shadow-rose',
          props.className,
        )}
        {...props}
      />
    </motion.div>
  );
}

export const AvatarImage = AvatarPrimitive.Image;

export function AvatarFallback(
  props: ComponentProps<typeof AvatarPrimitive.Fallback>,
): JSX.Element {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center bg-wine text-sm font-semibold text-blush',
        props.className,
      )}
      {...props}
    />
  );
}
