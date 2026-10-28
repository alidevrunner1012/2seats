'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fade, motionDurations } from '@/lib/motion';
import { Logo } from './Logo';
import {
  markSplashSeen,
  SPLASH_TIMELINE,
  shouldShowSplash,
  SPLASH_SKIP_DURATION,
  splashMotionMode,
  splashDuration,
} from './splash-state';

const taglineWords = ['Your', 'seat', 'is', 'always', 'next', 'to', 'mine.'];

export function Splash({
  onComplete,
  reducedMotionOverride,
}: {
  onComplete: () => void;
  reducedMotionOverride?: boolean;
}): JSX.Element {
  const router = useRouter();
  const deviceReducedMotion = useReducedMotion() ?? false;
  const reducedMotion = reducedMotionOverride ?? deviceReducedMotion;
  const [fastForward, setFastForward] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);
  const completed = useRef(false);
  const timer = useRef<number>(0);
  const finish = useCallback((): void => {
    if (finished.current) {
      return;
    }
    finished.current = true;
    setLeaving(true);
    window.clearTimeout(timer.current);
  }, []);

  const skip = useCallback((): void => {
    if (finished.current || fastForward) {
      return;
    }
    setFastForward(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(finish, SPLASH_SKIP_DURATION);
  }, [fastForward, finish]);

  useEffect(() => {
    timer.current = window.setTimeout(finish, splashDuration(reducedMotion));
    void router.prefetch('/');
    void router.prefetch('/design');

    return () => window.clearTimeout(timer.current);
  }, [finish, reducedMotion, router]);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const pageOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = pageOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (): void => skip();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skip]);

  const showTimeline = !reducedMotion && !fastForward;

  return (
    <motion.div
      data-splash-overlay
      data-motion-mode={splashMotionMode(reducedMotion)}
      className="fixed inset-0 z-[200] grid min-h-[100svh] place-items-center overflow-hidden bg-[rgb(26_11_20_/_0.92)] px-5 backdrop-blur-xl"
      role="status"
      aria-live="polite"
      aria-label="2Seats is getting your movie night ready"
      onClick={skip}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{
        duration: leaving ? (reducedMotion ? 0.1 : 0.2) : 0.32,
        ease: 'easeOut',
      }}
      onAnimationComplete={() => {
        if (leaving && !completed.current) {
          completed.current = true;
          onComplete();
        }
      }}
    >
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(76vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(232_70_108_/_0.2)_0%,rgb(255_184_107_/_0.08)_38%,transparent_70%)] blur-3xl"
        animate={
          showTimeline
            ? { opacity: [0.28, 0.75, 0.48], scale: [0.78, 1.08, 1] }
            : { opacity: 0.42, scale: 1 }
        }
        transition={
          showTimeline
            ? { duration: 2.8, times: [0, 0.55, 1], ease: 'easeInOut' }
            : { duration: 0.35 }
        }
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          animate={
            leaving
              ? { scale: 0.5, y: -28, opacity: 0.7 }
              : { scale: 1, y: 0, opacity: 1 }
          }
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          <Logo
            size="lg"
            animated={showTimeline}
            fastForward={fastForward}
            layoutId="2seats-brand-logo"
          />
        </motion.div>

        <motion.p
          className="mt-7 flex flex-wrap justify-center gap-x-[0.32em] font-display text-lg text-cream/80 sm:text-xl"
          initial="hidden"
          animate={leaving ? 'exit' : 'visible'}
          variants={{
            hidden: {},
            visible: {
              transition: {
                delayChildren: reducedMotion
                  ? 0
                  : fastForward
                    ? 0.05
                    : SPLASH_TIMELINE.tagline,
                staggerChildren: reducedMotion ? 0 : fastForward ? 0.025 : 0.11,
              },
            },
            exit: {
              opacity: 0,
              y: -8,
              transition: { duration: motionDurations.quick },
            },
          }}
          aria-label="Your seat is always next to mine."
        >
          {taglineWords.map((word) => (
            <motion.span
              key={word}
              aria-hidden="true"
              variants={{
                hidden: { opacity: 0, y: 8, filter: 'blur(5px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  ...(word === 'mine.' && !reducedMotion
                    ? {
                        textShadow: [
                          '0 0 0 rgb(255 184 107 / 0)',
                          '0 0 18px rgb(255 184 107 / 0.9)',
                          '0 0 0 rgb(255 184 107 / 0)',
                        ],
                      }
                    : {}),
                  transition: {
                    duration: word === 'mine.' && !reducedMotion ? 0.9 : 0.32,
                  },
                },
                exit: { opacity: 0, y: -8 },
              }}
              className={word === 'mine.' ? 'text-candle' : ''}
            >
              {word}
            </motion.span>
          ))}
        </motion.p>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 text-center text-[11px] tracking-wide text-cream/40">
        <span>
          {fastForward
            ? 'Bringing your seats a little closer…'
            : 'Press any key or click to skip'}
        </span>
        {!fastForward && (
          <button
            type="button"
            onClick={skip}
            className="rounded-full px-3 py-1 text-cream/60 underline decoration-cream/20 underline-offset-4 transition-colors hover:text-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
          >
            Skip intro
          </button>
        )}
      </div>
      <motion.div
        className="sr-only"
        variants={fade}
        initial="hidden"
        animate="visible"
      >
        Your seat is always next to mine.
      </motion.div>
    </motion.div>
  );
}

export function SplashGate({
  storage,
  onVisibilityChange,
}: {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  onVisibilityChange?: (visible: boolean) => void;
}): JSX.Element {
  const [visible, setVisible] = useState(true);
  const storageRef = useRef(storage);

  useEffect(() => {
    try {
      const session = storageRef.current ?? window.sessionStorage;
      if (shouldShowSplash(session)) {
        markSplashSeen(session);
        return;
      }
      setVisible(false);
      onVisibilityChange?.(false);
    } catch (error) {
      console.error(
        'Unable to access intro session storage; showing the intro.',
        error,
      );
      setVisible(true);
      onVisibilityChange?.(true);
    }
  }, [onVisibilityChange]);

  useEffect(() => {
    const replay = (): void => {
      document.documentElement.removeAttribute('data-intro-seen');
      setVisible(true);
      onVisibilityChange?.(true);
    };
    window.addEventListener('2seats:replay-intro', replay);
    return () => window.removeEventListener('2seats:replay-intro', replay);
  }, [onVisibilityChange]);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <Splash
          key="intro-splash"
          onComplete={() => {
            document.documentElement.dataset.introSeen = 'true';
            setVisible(false);
            onVisibilityChange?.(false);
          }}
        />
      )}
    </AnimatePresence>
  );
}
