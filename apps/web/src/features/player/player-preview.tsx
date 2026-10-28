'use client';

import { motion } from 'framer-motion';
import { Pause, Play, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { pressable } from '@/lib/motion';

export function PlayerPreview(): JSX.Element {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState([72]);

  return (
    <div className="glass w-full max-w-md overflow-hidden rounded-3xl">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-wine via-[#29101f] to-midnight">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_105%,rgb(255_184_107_/_0.24),transparent_50%)]" />
        <div className="relative text-center">
          <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-blush/70">
            Now showing
          </span>
          <span className="font-display text-3xl text-cream">
            Your next story
          </span>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-rose"
          initial={{ width: '28%' }}
          animate={{ width: playing ? '62%' : '28%' }}
          transition={{ duration: 1.2 }}
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Button
          size="icon"
          variant="ghost"
          className="size-9 min-h-9"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? 'Pause movie preview' : 'Play movie preview'}
        >
          {playing ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
        </Button>
        <span className="text-xs tabular-nums text-cream/55">
          12:08 / 1:42:16
        </span>
        <div className="mx-2 flex min-w-0 flex-1 items-center gap-2">
          <Volume2
            className="size-4 shrink-0 text-cream/55"
            aria-hidden="true"
          />
          <Slider
            aria-label="Volume"
            min={0}
            max={100}
            value={volume}
            onValueChange={setVolume}
          />
        </div>
        <motion.span
          variants={pressable}
          initial="idle"
          whileHover="hover"
          whileTap="press"
          className="sr-only"
        >
          Shared movie controls
        </motion.span>
      </div>
    </div>
  );
}
