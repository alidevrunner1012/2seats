'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import type { ComponentProps, ReactNode } from 'react';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: string;
}): JSX.Element {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={8} asChild>
            <motion.div
              className="glass z-50 rounded-xl px-3 py-2 text-xs text-cream shadow-rose data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              {content}
              <TooltipPrimitive.Arrow className="fill-wine" />
            </motion.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
