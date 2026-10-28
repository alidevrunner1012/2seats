'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { springs } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList(
  props: ComponentProps<typeof TabsPrimitive.List>,
): JSX.Element {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex max-w-full gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap rounded-full border border-rose/15 bg-midnight/50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        props.className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger(
  props: ComponentProps<typeof TabsPrimitive.Trigger>,
): JSX.Element {
  return (
    <TabsPrimitive.Trigger
      {...props}
      className={cn(
        'group relative rounded-full px-4 py-2 text-sm text-cream/55 outline-none transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rose data-[state=active]:text-cream',
        'shrink-0',
        props.className,
      )}
    >
      {props.children}
      <motion.span
        layoutId="tabs-underline"
        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-rose opacity-0 shadow-rose transition-opacity group-data-[state=active]:opacity-100"
        transition={springs.playful}
      />
    </TabsPrimitive.Trigger>
  );
}
