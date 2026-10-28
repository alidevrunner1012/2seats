'use client';

import { motion, type Transition } from 'framer-motion';
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { SPLASH_TIMELINE } from './splash-state';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  size?: LogoSize;
  animated?: boolean;
  fastForward?: boolean;
  layoutId?: string;
  className?: string;
}

const logoSizes: Record<LogoSize, { icon: string; text: string }> = {
  sm: { icon: 'h-9 w-[3.7rem]', text: 'text-xl' },
  md: { icon: 'h-12 w-[4.9rem]', text: 'text-2xl' },
  lg: { icon: 'h-20 w-[8.2rem]', text: 'text-5xl sm:text-6xl' },
};

const word = '2Seats';
const letters = Array.from(word);

export function Logo({
  size = 'md',
  animated = false,
  fastForward = false,
  layoutId,
  className,
}: LogoProps): JSX.Element {
  const instanceId = useId().replaceAll(':', '');
  const dimensions = logoSizes[size];
  const drawDuration = fastForward ? 0.22 : 0.58;
  const letterDelay = fastForward ? 0.04 : SPLASH_TIMELINE.wordmark;
  const letterStep = fastForward ? 0.025 : 0.048;
  const letterDuration = fastForward ? 0.2 : 0.38;
  const popDelay = fastForward ? 0.05 : SPLASH_TIMELINE.heart;
  const popTransition: Transition = fastForward
    ? { type: 'spring', stiffness: 360, damping: 24, delay: popDelay }
    : { type: 'spring', stiffness: 390, damping: 15, delay: popDelay };

  return (
    <motion.div
      layoutId={layoutId}
      className={`inline-flex items-center gap-3 ${className ?? ''}`}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      aria-label="2Seats"
    >
      <svg
        viewBox="0 0 112 82"
        role="img"
        aria-label="Two theatre seats with a heart between them"
        className={`${dimensions.icon} shrink-0 overflow-visible`}
        fill="none"
      >
        <defs>
          <linearGradient
            id={`seat-rose-${instanceId}`}
            x1="21"
            y1="35"
            x2="44"
            y2="66"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFB3C6" />
            <stop offset="1" stopColor="#E8466C" />
          </linearGradient>
          <linearGradient
            id={`seat-blush-${instanceId}`}
            x1="68"
            y1="35"
            x2="92"
            y2="66"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFF4EC" />
            <stop offset="1" stopColor="#FFB3C6" />
          </linearGradient>
        </defs>

        <motion.path
          d="M18 37V30C18 25.6 21.6 22 26 22H43C47.4 22 51 25.6 51 30V37"
          pathLength={1}
          initial={animated ? { pathLength: 0, opacity: 0.35 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: drawDuration,
            delay: animated ? SPLASH_TIMELINE.seats : 0,
            ease: 'easeInOut',
          }}
          stroke={`url(#seat-rose-${instanceId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <motion.path
          d="M61 37V30C61 25.6 64.6 22 69 22H86C90.4 22 94 25.6 94 30V37"
          pathLength={1}
          initial={animated ? { pathLength: 0, opacity: 0.35 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: drawDuration,
            delay: animated ? (fastForward ? 0.34 : 0.58) : 0,
            ease: 'easeInOut',
          }}
          stroke={`url(#seat-blush-${instanceId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <motion.path
          d="M16 39C16 36.8 17.8 35 20 35H48C50.2 35 52 36.8 52 39V53C52 56.3 49.3 59 46 59H22C18.7 59 16 56.3 16 53V39Z"
          pathLength={1}
          initial={animated ? { pathLength: 0, opacity: 0.35 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: drawDuration,
            delay: animated ? 0.42 : 0,
            ease: 'easeInOut',
          }}
          stroke={`url(#seat-rose-${instanceId})`}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <motion.path
          d="M60 39C60 36.8 61.8 35 64 35H92C94.2 35 96 36.8 96 39V53C96 56.3 93.3 59 90 59H66C62.7 59 60 56.3 60 53V39Z"
          pathLength={1}
          initial={animated ? { pathLength: 0, opacity: 0.35 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: drawDuration,
            delay: animated ? (fastForward ? 0.08 : 0.68) : 0,
            ease: 'easeInOut',
          }}
          stroke={`url(#seat-blush-${instanceId})`}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <motion.path
          d="M20 61V67M48 61V67M64 61V67M92 61V67M18 67H50M62 67H94"
          pathLength={1}
          initial={animated ? { pathLength: 0, opacity: 0.3 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: fastForward ? 0.18 : 0.38,
            delay: animated ? (fastForward ? 0.12 : 0.84) : 0,
          }}
          stroke="#FFB86B"
          strokeOpacity="0.82"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <motion.g
          initial={animated ? { scale: 0, opacity: 0, rotate: -14 } : false}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={popTransition}
          style={{ transformOrigin: '56px 13px' } as CSSProperties}
        >
          <path
            d="M56 17.3C56 17.3 47.8 12.6 47.8 7.3C47.8 3 53.5 1.8 56 6C58.5 1.8 64.2 3 64.2 7.3C64.2 12.6 56 17.3 56 17.3Z"
            fill="#E8466C"
            stroke="#FFB3C6"
            strokeWidth="1.2"
          />
          {animated && (
            <>
              <motion.path
                d="M43 8L40.5 6M69 8L71.5 6M42 17L39 18M70 17L73 18M56 0V-3"
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: [0, 1, 0], scale: [0.35, 1, 1.35] }}
                transition={{
                  duration: fastForward ? 0.4 : 0.6,
                  delay: popDelay + 0.12,
                }}
                stroke="#FFB86B"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <motion.circle
                cx="42"
                cy="3"
                r="1.5"
                fill="#FFB86B"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.3],
                  x: -5,
                  y: -4,
                }}
                transition={{ duration: 0.6, delay: popDelay + 0.14 }}
              />
              <motion.circle
                cx="70"
                cy="3"
                r="1.5"
                fill="#FFB86B"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.3],
                  x: 5,
                  y: -4,
                }}
                transition={{ duration: 0.6, delay: popDelay + 0.14 }}
              />
            </>
          )}
        </motion.g>
      </svg>

      <span
        className={`inline-flex whitespace-nowrap font-display font-semibold tracking-tight ${dimensions.text}`}
        aria-hidden="true"
      >
        {letters.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            initial={
              animated ? { opacity: 0, y: 9, filter: 'blur(7px)' } : false
            }
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: letterDuration,
              delay: animated ? letterDelay + index * letterStep : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={index === 0 ? 'text-rose' : 'text-cream'}
          >
            {letter}
          </motion.span>
        ))}
      </span>
    </motion.div>
  );
}
