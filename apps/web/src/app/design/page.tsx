'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, Heart, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SeatsLoader, HeartLoader } from '@/components/ui/loaders';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/features/brand/Logo';
import { InteractionFooterLink } from '@/features/brand/InteractionProvider';
import { InviteForm } from '@/features/auth/invite-form';
import { MessageBubble } from '@/features/chat/message-bubble';
import { PlayerPreview } from '@/features/player/player-preview';
import { SeatPreview } from '@/features/room/seat-preview';
import { fadeUp, hoverLift, pressable, stagger } from '@/lib/motion';

export default function DesignPage(): JSX.Element {
  const [volume, setVolume] = useState([68]);
  const [notifications, setNotifications] = useState(true);
  const show = useToast();

  return (
    <main className="min-h-screen px-5 pb-20 sm:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between py-6">
        <Link
          href="/"
          aria-label="2Seats home"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
        >
          <Logo size="sm" layoutId="2seats-brand-logo" />
        </Link>
        <Link
          href="/"
          className="rounded-full px-4 py-2 text-sm text-cream/60 transition-colors hover:bg-white/5 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
        >
          Back home
        </Link>
      </header>

      <motion.div
        className="mx-auto max-w-7xl"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.section
          variants={fadeUp}
          className="py-10 text-center sm:py-16"
        >
          <Badge variant="amber">
            <Sparkles className="size-3" aria-hidden="true" />
            The 2Seats design system
          </Badge>
          <h1 className="type-display-page gradient-text mt-5">
            A little date-night magic
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-cream/55 sm:text-base">
            Warm candlelight, two seats side by side, and the little details
            that make being together feel effortless.
          </p>
        </motion.section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Showcase
            title="Buttons & badges"
            description="Hover, press, focus, and let a little glow in."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button>Save us two seats</Button>
              <Button variant="ghost">Maybe later</Button>
              <Button variant="glass">
                <Heart className="size-4 fill-current" aria-hidden="true" />
                Send a little love
              </Button>
              <Button size="sm">Small button</Button>
              <Button size="icon" variant="ghost" aria-label="Send a heart">
                <Heart className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Together</Badge>
              <Badge variant="amber">Date night</Badge>
              <Badge variant="muted">Just us</Badge>
            </div>
          </Showcase>

          <Showcase
            title="A gentle hello"
            description="A floating label input and a familiar face."
          >
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
              <Input label="Your name" defaultValue="Avery" />
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>AV</AvatarFallback>
                </Avatar>
                <span className="text-sm text-cream/65">Avery’s seat</span>
              </div>
            </div>
          </Showcase>

          <Showcase
            title="A shared little moment"
            description="Tabs glide softly from one mode to the next."
          >
            <Tabs defaultValue="synced">
              <TabsList>
                <TabsTrigger value="synced">Synced player</TabsTrigger>
                <TabsTrigger value="screen">Screen share</TabsTrigger>
                <TabsTrigger value="browser">Cloud browser</TabsTrigger>
              </TabsList>
              <TabsContent value="synced" className="mt-5">
                <PlayerPreview />
              </TabsContent>
              <TabsContent value="screen" className="mt-5">
                <div className="glass flex aspect-video max-w-md items-center justify-center rounded-3xl text-sm text-cream/55">
                  Your screen, side by side.
                </div>
              </TabsContent>
              <TabsContent value="browser" className="mt-5">
                <div className="glass flex aspect-video max-w-md items-center justify-center rounded-3xl text-sm text-cream/55">
                  A cozy shared browser window.
                </div>
              </TabsContent>
            </Tabs>
          </Showcase>

          <Showcase
            title="Two seats, saved"
            description="Turn on a little reminder for your next date."
          >
            <SeatPreview />
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.035] p-4">
              <div>
                <p className="text-sm font-medium text-cream">
                  Date night reminders
                </p>
                <p className="mt-1 text-xs text-cream/45">
                  A gentle nudge before the movie
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                aria-label="Date night reminders"
              />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="text-xs text-cream/55">Volume</span>
              <Slider
                aria-label="Demo volume"
                value={volume}
                onValueChange={setVolume}
              />
              <span className="w-8 text-right text-xs tabular-nums text-blush">
                {volume[0]}%
              </span>
            </div>
          </Showcase>

          <Showcase
            title="A note between scenes"
            description="A small heart, for the little things."
          >
            <div className="glass flex max-w-sm flex-col gap-3 rounded-3xl p-5">
              <MessageBubble message="I saved your favorite seat ✨" />
              <MessageBubble
                message="Already feels like we're together."
                mine
              />
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() =>
                  show({
                    title: 'A little love, sent',
                    description: 'Your heart is on its way to the next seat.',
                  })
                }
              >
                <Heart
                  className="size-4 fill-rose text-rose"
                  aria-hidden="true"
                />
                Send a heart
              </Button>
            </div>
          </Showcase>

          <Showcase
            title="The little details"
            description="Tooltips, loading states, and a soft landing."
          >
            <div className="flex flex-wrap items-center gap-6">
              <Tooltip content="Copied your cozy invite link">
                <Button
                  size="icon"
                  variant="glass"
                  aria-label="Copy invite"
                  onClick={() =>
                    show({
                      title: 'Invite link copied',
                      description: 'Your plus-one is one tap away.',
                    })
                  }
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              </Tooltip>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="glass">Preview dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Your seats are waiting</DialogTitle>
                  <DialogDescription>
                    Share this little room with someone who makes every story
                    better.
                  </DialogDescription>
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() =>
                        show({
                          title: 'Lovely choice',
                          description: 'See you at the movies.',
                        })
                      }
                    >
                      Sounds lovely
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 280 }}
              >
                <HeartLoader label="Waiting for your favorite person" />
              </motion.div>
              <SeatsLoader />
            </div>
            <div className="mt-7 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </Showcase>

          <Showcase
            title="Come on in"
            description="Invite form states, with thoughtful validation."
          >
            <InviteForm />
          </Showcase>

          <Showcase
            title="The color of a cozy night"
            description="Midnight plum, rose, blush, candlelight, cream."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Midnight plum', '#1A0B14'],
                ['Wine', '#3B0F26'],
                ['Rose', '#E8466C'],
                ['Blush', '#FFB3C6'],
                ['Candle amber', '#FFB86B'],
                ['Cream', '#FFF4EC'],
              ].map(([name, hex]) => (
                <div
                  key={hex}
                  className="rounded-2xl border border-white/10 bg-midnight/40 p-3"
                >
                  <div
                    className="mb-3 h-12 rounded-xl"
                    style={{ backgroundColor: hex }}
                  />
                  <p className="text-xs font-medium text-cream">{name}</p>
                  <p className="mt-1 font-mono text-[10px] text-cream/40">
                    {hex}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-cream/45">
              <Check className="size-3 text-blush" aria-hidden="true" />
              Dark romantic theme · Fraunces + Inter · Reduced-motion aware
            </div>
          </Showcase>
        </div>
        <footer className="mt-12 flex flex-col items-center gap-2 text-center text-xs text-cream/35">
          <p>Your seat is always next to mine.</p>
          <InteractionFooterLink />
        </footer>
      </motion.div>
    </main>
  );
}

function Showcase({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <motion.section
      whileHover="hover"
      whileTap="press"
      variants={{ ...fadeUp, ...hoverLift, ...pressable }}
      className="glass noise-overlay overflow-hidden rounded-3xl p-5 sm:p-7"
    >
      <h2 className="type-display-card text-cream">{title}</h2>
      <p className="mb-6 mt-1 text-xs leading-5 text-cream/45">{description}</p>
      {children}
    </motion.section>
  );
}
