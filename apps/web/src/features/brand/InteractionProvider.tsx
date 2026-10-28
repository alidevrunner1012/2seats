'use client';

import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { MousePointer2, Volume2, VolumeX } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { pressable } from '@/lib/motion';
import { usePreferenceStore } from '@/store/preference-store';
import { SplashGate } from './Splash';
import { RipplePool } from './ripple-pool';

const REPLAY_EVENT = '2seats:replay-intro';

interface InteractionSettings {
  cursorEnabled: boolean;
  soundEnabled: boolean;
  setCursorEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  replayIntro: () => void;
}

const InteractionContext = createContext<InteractionSettings | null>(null);

export function useInteractionSettings(): InteractionSettings {
  const settings = useContext(InteractionContext);
  if (settings === null) {
    throw new Error(
      'useInteractionSettings must be used within InteractionProvider',
    );
  }
  return settings;
}

export function InteractionProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;
  const cursorEnabled = usePreferenceStore((state) => state.cursorEnabled);
  const soundEnabled = usePreferenceStore((state) => state.soundEnabled);
  const updatePreferences = usePreferenceStore((state) => state.update);
  const hydratePreferences = usePreferenceStore((state) => state.hydrate);
  const [splashVisible, setSplashVisible] = useState(true);
  const rippleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<RipplePool | null>(null);
  const frameRef = useRef<number>(0);

  const replayIntro = useCallback((): void => {
    window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
  }, []);

  useEffect(() => hydratePreferences(), [hydratePreferences]);

  useEffect(() => {
    const targets = rippleRefs.current.filter(
      (element): element is HTMLSpanElement =>
        element !== null && typeof element.animate === 'function',
    );
    poolRef.current = new RipplePool(targets);

    const handleClick = (event: MouseEvent): void => {
      if (reducedMotion || !(event.target instanceof Element)) {
        return;
      }
      if (event.target.closest('[data-splash-overlay]') !== null) {
        return;
      }
      poolRef.current?.spawn(event.clientX, event.clientY, performance.now());
      if (soundEnabled) {
        playUiSound(
          event.target.closest('[data-sound="pop"]') ? 'pop' : 'click',
        );
      }
    };

    window.addEventListener('click', handleClick, { passive: true });
    return () => window.removeEventListener('click', handleClick);
  }, [reducedMotion, soundEnabled]);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (cursor === null || reducedMotion || !cursorEnabled) {
      return;
    }
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches) {
      return;
    }

    const moveCursor = (event: PointerEvent): void => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate3d(-50%, -50%, 0)`;
        cursor.style.opacity = '1';
      });
    };
    const hideCursor = (): void => {
      cursor.style.opacity = '0';
    };
    window.addEventListener('pointermove', moveCursor, { passive: true });
    window.addEventListener('blur', hideCursor);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('pointermove', moveCursor);
      window.removeEventListener('blur', hideCursor);
      cursor.style.opacity = '0';
    };
  }, [cursorEnabled, reducedMotion]);

  useEffect(() => {
    if (pageContentRef.current !== null) {
      pageContentRef.current.inert = splashVisible;
    }
  }, [splashVisible]);

  const settings: InteractionSettings = {
    cursorEnabled,
    soundEnabled,
    setCursorEnabled: (enabled) =>
      updatePreferences({ cursorEnabled: enabled }),
    setSoundEnabled: (enabled) => updatePreferences({ soundEnabled: enabled }),
    replayIntro,
  };

  return (
    <InteractionContext.Provider value={settings}>
      <LayoutGroup id="2seats-shared-elements">
        <div className="relative min-h-screen">
          <div
            ref={pageContentRef}
            aria-hidden={splashVisible}
            className="min-h-screen"
          >
            {children}
            <InteractionPreferences />
          </div>
          <SplashGate onVisibilityChange={setSplashVisible} />
          <div
            ref={cursorRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-[150] size-10 rounded-full border border-blush/70 bg-rose/10 opacity-0 shadow-[0_0_28px_rgb(232_70_108_/_0.32)] backdrop-blur-sm transition-opacity duration-200"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[190] overflow-hidden"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                ref={(element) => {
                  rippleRefs.current[index] = element;
                }}
                className="absolute left-0 top-0 block size-9 opacity-0 will-change-transform"
              >
                <svg viewBox="0 0 32 32" className="size-full" fill="none">
                  <path
                    d="M16 28S3 20 3 11.2C3 4 12.2 1.6 16 8.5 19.8 1.6 29 4 29 11.2 29 20 16 28 16 28Z"
                    fill="#E8466C"
                    fillOpacity=".85"
                    stroke="#FFB3C6"
                    strokeWidth="1.2"
                  />
                </svg>
              </span>
            ))}
          </div>
        </div>
      </LayoutGroup>
    </InteractionContext.Provider>
  );
}

function InteractionPreferences(): JSX.Element {
  const { cursorEnabled, soundEnabled, setCursorEnabled, setSoundEnabled } =
    useInteractionSettings();

  return (
    <div
      role="group"
      aria-label="Interaction preferences"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-[120] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-2 rounded-full border border-rose/20 bg-midnight/85 p-1.5 shadow-rose backdrop-blur-xl sm:bottom-4 sm:left-4 sm:translate-x-0 sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"
    >
      <motion.div
        variants={pressable}
        initial="idle"
        whileHover="hover"
        whileTap="press"
      >
        <Button
          variant="glass"
          size="sm"
          className="whitespace-nowrap"
          aria-pressed={soundEnabled}
          onClick={() => setSoundEnabled(!soundEnabled)}
          aria-label={`UI sounds ${soundEnabled ? 'on' : 'off'}`}
        >
          {soundEnabled ? (
            <Volume2 className="size-3.5" aria-hidden="true" />
          ) : (
            <VolumeX className="size-3.5" aria-hidden="true" />
          )}
          Sound {soundEnabled ? 'on' : 'off'}
        </Button>
      </motion.div>
      <motion.div
        variants={pressable}
        initial="idle"
        whileHover="hover"
        whileTap="press"
      >
        <Button
          variant="glass"
          size="sm"
          data-cursor-preference
          className="whitespace-nowrap"
          aria-pressed={cursorEnabled}
          onClick={() => setCursorEnabled(!cursorEnabled)}
          aria-label={`Cursor glow ${cursorEnabled ? 'on' : 'off'}`}
        >
          <MousePointer2 className="size-3.5" aria-hidden="true" />
          Cursor {cursorEnabled ? 'on' : 'off'}
        </Button>
      </motion.div>
    </div>
  );
}

function playUiSound(kind: 'click' | 'pop'): void {
  const AudioContextConstructor = window.AudioContext;
  if (AudioContextConstructor === undefined) {
    return;
  }
  const context = new AudioContextConstructor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const startFrequency = kind === 'pop' ? 660 : 520;
  const endFrequency = kind === 'pop' ? 940 : 410;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    kind === 'pop' ? 0.045 : 0.025,
    now + 0.012,
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.14);
  oscillator.addEventListener('ended', () => {
    void context.close();
  });
}

export function InteractionFooterLink(): JSX.Element {
  const { replayIntro } = useInteractionSettings();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={replayIntro}
        className="rounded-full px-2 py-1 text-xs text-cream/45 transition-colors hover:text-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
      >
        Replay intro
      </button>
      <span aria-hidden="true" className="text-cream/20">
        ·
      </span>
    </div>
  );
}
