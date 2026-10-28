'use client';
import { RefObject, useEffect } from 'react';
import { DEFAULT_AMBIENT, averageColor, softenColor } from './ambient';

const set = (c: { r: number; g: number; b: number }) =>
  document.documentElement.style.setProperty('--ambient', `${c.r} ${c.g} ${c.b}`);

/** Samples a 16x9 downscale twice a second and writes CSS var --ambient ("r g b"). Use: rgb(var(--ambient) / .35) */
export function useAmbientGlow(video: RefObject<HTMLVideoElement | null>, enabled = true) {
  useEffect(() => {
    set(DEFAULT_AMBIENT);
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 9;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const id = window.setInterval(() => {
      const v = video.current;
      if (!v || v.paused || v.readyState < 2) return;
      try {
        ctx.drawImage(v, 0, 0, 16, 9);
        set(softenColor(averageColor(ctx.getImageData(0, 0, 16, 9).data)));
      } catch {
        // Cross-origin video taints the canvas (SecurityError): keep the default glow and stop sampling.
        window.clearInterval(id);
        set(DEFAULT_AMBIENT);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [video, enabled]);
}
