'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { scaleIn } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  children: ReactNode;
}): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-midnight/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className="group fixed inset-0 z-50 grid place-items-center p-5 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        {...props}
      >
        <motion.div
          className={cn(
            'glass relative max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] w-[min(92vw,30rem)] overflow-y-auto rounded-3xl p-5 text-cream shadow-rose sm:p-7',
            className,
          )}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-cream/60 transition hover:bg-white/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle(
  props: ComponentProps<typeof DialogPrimitive.Title>,
): JSX.Element {
  return (
    <DialogPrimitive.Title
      className={cn('font-display text-2xl text-cream', props.className)}
      {...props}
    />
  );
}

export function DialogDescription(
  props: ComponentProps<typeof DialogPrimitive.Description>,
): JSX.Element {
  return (
    <DialogPrimitive.Description
      className={cn('mt-2 text-sm leading-6 text-cream/60', props.className)}
      {...props}
    />
  );
}
