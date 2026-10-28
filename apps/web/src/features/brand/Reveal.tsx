'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fadeUp, hoverLift, pressable } from '@/lib/motion';

export function Reveal({
  children,
  className,
  variants = fadeUp,
  threshold = 0.12,
  rootMargin = '0px 0px -36px 0px',
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  threshold?: number;
  rootMargin?: string;
}): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const interactiveVariants: Variants = {
    ...variants,
    ...hoverLift,
    ...pressable,
  };

  useEffect(() => {
    let observer: IntersectionObserver | undefined;
    const frame = window.requestAnimationFrame(() => {
      if (reducedMotion) {
        setVisible(true);
        return;
      }
      const element = elementRef.current;
      if (element === null || typeof IntersectionObserver === 'undefined') {
        setVisible(true);
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setVisible(true);
            observer?.unobserve(element);
          }
        },
        { threshold, rootMargin },
      );
      observer.observe(element);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [reducedMotion, rootMargin, threshold]);

  return (
    <motion.div
      ref={elementRef}
      className={className}
      variants={interactiveVariants}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
      whileHover="hover"
      whileTap="press"
      transition={reducedMotion ? { duration: 0 } : undefined}
      style={{
        willChange: visible || reducedMotion ? 'auto' : 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  );
}
