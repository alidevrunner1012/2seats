'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { pageTransition } from '@/lib/motion';

type RouteStage = 'visible' | 'exit' | 'enter';

interface RouteState {
  pathname: string;
  stage: RouteStage;
}

export function RouteTransition({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const navigationTimer = useRef<number | null>(null);
  const [route, setRoute] = useState<RouteState>({
    pathname,
    stage: 'visible',
  });

  if (route.pathname !== pathname && route.stage !== 'enter') {
    setRoute({ pathname, stage: 'enter' });
  }

  useEffect(() => {
    return () => {
      if (navigationTimer.current !== null) {
        window.clearTimeout(navigationTimer.current);
      }
    };
  }, []);

  const handleLinkClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const anchor = event.target.closest('a[href]');
    if (
      !(anchor instanceof HTMLAnchorElement) ||
      (anchor.target !== '' && anchor.target !== '_self') ||
      anchor.hasAttribute('download')
    ) {
      return;
    }

    const destination = new URL(anchor.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      destination.pathname === pathname
    ) {
      return;
    }

    event.preventDefault();
    if (navigationTimer.current !== null) {
      window.clearTimeout(navigationTimer.current);
    }
    setRoute((current) => ({ ...current, stage: 'exit' }));
    navigationTimer.current = window.setTimeout(
      () => {
        router.push(
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
        setRoute({ pathname: destination.pathname, stage: 'enter' });
      },
      reducedMotion ? 120 : 200,
    );
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={route.pathname}
        data-route-path={route.pathname}
        data-route-stage={route.stage}
        onClickCapture={handleLinkClick}
        variants={pageTransition}
        initial={route.stage === 'visible' ? false : 'hidden'}
        animate={route.stage === 'exit' ? 'exit' : 'visible'}
        transition={reducedMotion ? { duration: 0.12 } : undefined}
        onAnimationComplete={() => {
          if (route.stage === 'enter') {
            setRoute((current) =>
              current.stage === 'enter'
                ? { ...current, stage: 'visible' }
                : current,
            );
          }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
