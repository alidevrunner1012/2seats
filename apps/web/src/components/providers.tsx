'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { ToastViewport } from '@/components/ui/toast';
import { InteractionProvider } from '@/features/brand/InteractionProvider';
import { RouteTransition } from '@/features/brand/RouteTransition';
import { usePreferenceStore } from '@/store/preference-store';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  const reducedMotionEnabled = usePreferenceStore(
    (state) => state.reducedMotionEnabled,
  );
  useEffect(() => {
    if (reducedMotionEnabled) {
      document.documentElement.dataset.reduceMotion = 'true';
    } else {
      delete document.documentElement.dataset.reduceMotion;
    }
  }, [reducedMotionEnabled]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <MotionConfig reducedMotion={reducedMotionEnabled ? 'always' : 'user'}>
      <QueryClientProvider client={queryClient}>
        <InteractionProvider>
          <>
            <RouteTransition>{children}</RouteTransition>
            <ToastViewport />
          </>
        </InteractionProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
