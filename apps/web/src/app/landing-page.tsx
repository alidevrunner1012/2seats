'use client';

import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CirclePlay,
  Clapperboard,
  Heart,
  MonitorPlay,
  Popcorn,
  Radio,
  Sparkles,
  UsersRound,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useState } from 'react';
import { Logo } from '@/features/brand/Logo';
import { InteractionFooterLink } from '@/features/brand/InteractionProvider';
import { Reveal } from '@/features/brand/Reveal';
import { fadeUp, hoverLift, pressable, stagger, tiltCard } from '@/lib/motion';

const steps = [
  {
    number: '01',
    icon: Heart,
    title: 'Send them an invite',
    detail: 'One little link opens a room made just for the two of you.',
  },
  {
    number: '02',
    icon: UsersRound,
    title: 'Take the next seat',
    detail: 'See their face, hear their laugh, and settle in together.',
  },
  {
    number: '03',
    icon: CirclePlay,
    title: 'Press play, together',
    detail: 'Choose how to watch. We’ll keep the moment in sync.',
  },
];

const watchModes = [
  {
    icon: Clapperboard,
    label: '01 / synced player',
    title: 'Your movie, in step',
    detail:
      'Share a supported video link and keep play, pause, and seeking together.',
    className: 'from-rose/20 to-wine/20',
    iconClass: 'text-blush',
  },
  {
    icon: Video,
    label: '02 / screen share',
    title: 'Bring your own screen',
    detail:
      'Netflix, Hotstar etc: use Screen Share with your own subscriptions.',
    className: 'from-candle/15 to-wine/20',
    iconClass: 'text-candle',
  },
  {
    icon: Radio,
    label: '03 / shared browser',
    title: 'A browser for two',
    detail:
      'Open a shared cloud browser and explore the web from the same place.',
    className: 'from-blush/15 to-rose/10',
    iconClass: 'text-blush',
  },
];

const faqs = [
  {
    question: 'Do we need to be in the same place?',
    answer:
      'That’s the lovely part: no. Join the same private room from wherever you are and bring your own snacks.',
  },
  {
    question: 'Can we watch Netflix or Hotstar together?',
    answer:
      'Use Screen Share with your own subscriptions. Streaming services may restrict sharing or show a black screen because of DRM, so availability depends on the service and device.',
  },
  {
    question: 'Which videos work in the synced player?',
    answer:
      'The synced player is for supported YouTube, Vimeo, MP4, and HLS sources. The screen-share and shared-browser options give you other ways to spend the evening.',
  },
  {
    question: 'Is our room private?',
    answer:
      'Rooms are created for invited guests. Only share your invite link with the people you want to join your movie night.',
  },
];

const particles = [
  { left: '8%', top: '15%', kind: 'heart', delay: 0 },
  { left: '21%', top: '8%', kind: 'popcorn', delay: 1.4 },
  { left: '35%', top: '21%', kind: 'sparkle', delay: 0.6 },
  { left: '48%', top: '7%', kind: 'heart', delay: 2.1 },
  { left: '62%', top: '18%', kind: 'popcorn', delay: 0.9 },
  { left: '78%', top: '11%', kind: 'sparkle', delay: 1.8 },
  { left: '91%', top: '23%', kind: 'heart', delay: 0.3 },
  { left: '12%', top: '38%', kind: 'sparkle', delay: 1.2 },
  { left: '28%', top: '47%', kind: 'heart', delay: 2.4 },
  { left: '41%', top: '38%', kind: 'popcorn', delay: 0.2 },
  { left: '57%', top: '49%', kind: 'sparkle', delay: 1.6 },
  { left: '72%', top: '39%', kind: 'heart', delay: 0.8 },
  { left: '86%', top: '51%', kind: 'popcorn', delay: 2.2 },
  { left: '5%', top: '66%', kind: 'heart', delay: 1 },
  { left: '19%', top: '78%', kind: 'sparkle', delay: 2.6 },
  { left: '34%', top: '68%', kind: 'popcorn', delay: 1.9 },
  { left: '67%', top: '75%', kind: 'heart', delay: 0.5 },
  { left: '82%', top: '69%', kind: 'sparkle', delay: 1.3 },
];

const particleIcons = {
  heart: Heart,
  popcorn: Popcorn,
  sparkle: Sparkles,
};

export default function LandingPage(): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [partnerArrived, setPartnerArrived] = useState(false);
  const { scrollYProgress } = useScroll();
  const seatsY = useTransform(scrollYProgress, [0, 1], [0, 38]);

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-10 sm:py-6">
        <Link
          href="/"
          aria-label="2Seats home"
          className="rounded-lg focus-visible:ring-2 focus-visible:ring-rose"
        >
          <Logo size="sm" layoutId="2seats-brand-logo" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-2 sm:gap-5"
        >
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm text-cream/70 transition hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose sm:px-4"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose/50 bg-rose/10 px-4 py-2 text-sm font-semibold text-blush transition hover:bg-rose/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose sm:px-5"
          >
            Start a date
          </Link>
        </nav>
      </header>

      <section
        className="relative isolate mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-7xl grid-cols-1 items-center gap-4 px-5 pb-12 pt-4 sm:px-10 sm:pb-20 lg:grid-cols-[1fr_0.95fr] lg:gap-0 lg:pt-0"
        aria-labelledby="hero-title"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose/[0.09] blur-[100px] sm:size-[42rem]" />
          {particles.map(({ left, top, kind, delay }, index) => {
            const Icon = particleIcons[kind as keyof typeof particleIcons];
            return (
              <motion.span
                key={`${kind}-${index}`}
                className={`absolute ${kind === 'popcorn' ? 'text-candle/45' : kind === 'heart' ? 'text-rose/35' : 'text-blush/45'}`}
                style={{ left, top }}
                animate={{ y: [0, -11, 2, 0], rotate: [0, 5, -4, 0] }}
                transition={{
                  duration: 5.5 + (index % 4) * 0.7,
                  delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Icon className="size-3.5 sm:size-4" strokeWidth={1.5} />
              </motion.span>
            );
          })}
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <motion.p
            variants={fadeUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-candle/20 bg-candle/[0.06] px-4 py-2 text-xs text-candle"
          >
            <Heart className="size-3.5 fill-current" aria-hidden="true" />
            For the ones who are far, but never apart
          </motion.p>
          <motion.h1
            id="hero-title"
            variants={fadeUp}
            className="type-display-hero gradient-text max-w-full"
          >
            Your seat is
            <br />
            <span className="whitespace-nowrap">always next to mine.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-lg text-base leading-7 text-cream/70 sm:mt-6 sm:text-lg sm:leading-8 lg:mx-0"
          >
            Movie dates for people who are miles apart.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-7 flex flex-col items-stretch justify-center gap-3 min-[420px]:flex-row min-[420px]:items-center lg:justify-start"
          >
            <motion.div
              variants={{ ...pressable, ...hoverLift }}
              initial="idle"
              whileHover="hover"
              whileTap="press"
            >
              <Link
                href="/signup"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-rose transition-colors hover:bg-[#f05a7b] hover:shadow-[0_0_38px_rgb(232_70_108_/_0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-midnight min-[420px]:w-auto"
              >
                Start a date night
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </motion.div>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm text-cream/75 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
            >
              See how it works
              <ArrowDown className="size-4" aria-hidden="true" />
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-5 text-xs text-cream/40">
            Two seats. One little movie night.
          </motion.p>
        </motion.div>

        <motion.div
          style={{ y: seatsY }}
          className="relative mx-auto flex min-h-[18rem] w-full max-w-xl items-center justify-center sm:min-h-[24rem] lg:min-h-[34rem]"
          aria-hidden="true"
        >
          <TheatreSeats />
        </motion.div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-8 px-5 py-16 sm:px-10 sm:py-24"
        aria-labelledby="steps-title"
      >
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.26em] text-blush/65">
              Little steps, a closer night
            </p>
            <h2
              id="steps-title"
              className="type-display-section mt-3 text-cream"
            >
              How it works
            </h2>
            <p className="mt-3 text-sm leading-6 text-cream/55 sm:text-base">
              From a hello to the opening credits, it only takes a moment.
            </p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, detail }) => (
              <Reveal
                key={number}
                className="glass group relative overflow-hidden rounded-3xl p-6 transition-colors hover:border-rose/35 hover:bg-white/[0.045] sm:p-7"
              >
                <span className="absolute right-6 top-5 font-display text-5xl text-rose/[0.12]">
                  {number}
                </span>
                <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-rose/10 text-blush transition-colors group-hover:bg-rose/20">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="type-display-card text-cream">{title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-cream/55">
                  {detail}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="ways-to-watch"
        className="scroll-mt-8 border-y border-white/[0.04] bg-wine/15 px-5 py-16 sm:px-10 sm:py-24"
        aria-labelledby="watch-title"
      >
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs uppercase tracking-[0.26em] text-candle/75">
              Pick your kind of together
            </p>
            <h2
              id="watch-title"
              className="type-display-section mt-3 text-cream"
            >
              Three ways to watch
            </h2>
            <p className="mt-3 text-sm leading-6 text-cream/55 sm:text-base">
              Choose the screen that feels right for tonight.
            </p>
          </Reveal>
          <div className="grid gap-4 lg:grid-cols-3">
            {watchModes.map(
              ({ icon: Icon, label, title, detail, className, iconClass }) => (
                <Reveal key={title}>
                  <motion.article
                    variants={tiltCard}
                    initial="idle"
                    whileHover="hover"
                    whileTap="press"
                    className={`glass h-full rounded-3xl bg-gradient-to-br ${className} p-6 sm:p-7`}
                  >
                    <Icon
                      className={`mb-7 size-7 ${iconClass}`}
                      aria-hidden="true"
                    />
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-cream/45">
                      {label}
                    </p>
                    <h3 className="type-display-card mt-3 text-cream">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-cream/60">
                      {detail}
                    </p>
                  </motion.article>
                </Reveal>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="together"
        className="scroll-mt-8 px-5 py-16 sm:px-10 sm:py-24"
        aria-labelledby="together-title"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.26em] text-blush/65">
              A little closer, even from far away
            </p>
            <h2
              id="together-title"
              className="type-display-section mt-3 text-cream"
            >
              Feels like being there
            </h2>
            <p className="mt-4 text-base leading-7 text-cream/60">
              Keep their smile in view, save them the next seat, and let the
              outside world fade for a while.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-cream/65">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-candle" aria-hidden="true" />A
                private room for your movie night
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-candle" aria-hidden="true" />
                Video, chat, and a shared screen
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-candle" aria-hidden="true" />
                Your subscriptions stay yours
              </li>
            </ul>
          </Reveal>
          <Reveal>
            <div className="glass relative overflow-hidden rounded-[2rem] p-5 shadow-rose sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blush/60">
                    tonight, just us
                  </p>
                  <p className="mt-1 font-display text-xl text-cream">
                    The little movie room
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-candle/20 bg-candle/[0.07] px-3 py-1.5 text-[0.65rem] text-candle">
                  <span className="size-1.5 animate-pulse rounded-full bg-candle motion-reduce:animate-none" />
                  room is cozy
                </span>
              </div>
              <div className="relative grid min-h-52 grid-cols-2 items-end gap-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-midnight/60 p-4 sm:min-h-60 sm:p-6">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rose/[0.12] to-transparent" />
                <RoomSeat label="Your seat" arrived />
                <RoomSeat label="Their seat" arrived={partnerArrived} />
                <div className="absolute left-1/2 top-5 -translate-x-1/2 text-candle">
                  <Heart className="size-4 fill-current" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-5 flex flex-col items-start justify-between gap-3 min-[420px]:flex-row min-[420px]:items-center">
                <p
                  className="text-sm text-cream/55"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {partnerArrived
                    ? 'They made it. Save them the best seat.'
                    : 'Your favorite person is one invite away.'}
                </p>
                <button
                  type="button"
                  onClick={() => setPartnerArrived((arrived) => !arrived)}
                  aria-pressed={partnerArrived}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rose/30 px-4 py-2 text-xs font-semibold text-blush transition hover:bg-rose/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
                >
                  {partnerArrived ? 'Send them home' : 'See them arrive'}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-8 border-y border-white/[0.04] bg-wine/10 px-5 py-16 sm:px-10 sm:py-24"
        aria-labelledby="faq-title"
      >
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-9 text-center sm:mb-12">
            <p className="text-xs uppercase tracking-[0.26em] text-candle/75">
              A few things you might wonder
            </p>
            <h2 id="faq-title" className="type-display-section mt-3 text-cream">
              Before the opening scene
            </h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map(({ question, answer }, index) => {
              const expanded = openFaq === index;
              const answerId = `faq-answer-${index}`;
              return (
                <Reveal key={question}>
                  <div className="glass overflow-hidden rounded-2xl">
                    <h3>
                      <button
                        type="button"
                        id={`faq-question-${index}`}
                        aria-expanded={expanded}
                        aria-controls={answerId}
                        onClick={() =>
                          setOpenFaq((current) =>
                            current === index ? null : index,
                          )
                        }
                        className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-cream transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose sm:px-6 sm:text-base"
                      >
                        <span>{question}</span>
                        <motion.span
                          animate={{ rotate: expanded ? 180 : 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.2 }}
                          className="shrink-0 text-blush"
                        >
                          <ChevronDown className="size-4" aria-hidden="true" />
                        </motion.span>
                      </button>
                    </h3>
                    <motion.div
                      id={answerId}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      initial={false}
                      animate={{
                        height: expanded ? 'auto' : 0,
                        opacity: expanded ? 1 : 0,
                      }}
                      transition={{ duration: reducedMotion ? 0 : 0.24 }}
                      aria-hidden={!expanded}
                      inert={!expanded}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-6 text-cream/60 sm:px-6">
                        {answer}
                      </p>
                    </motion.div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10 sm:py-24">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-rose/25 bg-gradient-to-br from-wine/80 via-wine/50 to-midnight px-6 py-12 text-center shadow-rose sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-rose/15 blur-[90px]"
            aria-hidden="true"
          />
          <Heart
            className="relative mx-auto mb-4 size-6 fill-rose text-rose"
            aria-hidden="true"
          />
          <h2 className="type-display-section relative text-cream">
            Save them the seat beside you.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-cream/60 sm:text-base">
            Pick a movie, send an invite, and make tonight feel a little closer.
          </p>
          <Link
            href="/signup"
            className="group relative mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-rose transition hover:bg-[#f05a7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
          >
            Save our seats
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </Reveal>
      </section>

      <footer className="flex flex-col items-center gap-4 border-t border-white/[0.06] px-5 py-8 pb-24 text-center text-xs text-cream/40 sm:px-10 sm:pb-8">
        <Link
          href="/"
          aria-label="2Seats home"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
        >
          <Logo size="sm" animated={false} />
        </Link>
        <p>Your seat is always next to mine.</p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <Link
            className="transition hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
            href="/terms"
          >
            Terms
          </Link>
          <Link
            className="transition hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
            href="/privacy"
          >
            Privacy
          </Link>
        </nav>
        <InteractionFooterLink />
      </footer>
    </main>
  );
}

function TheatreSeats(): JSX.Element {
  return (
    <div className="relative w-full max-w-[34rem]">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose/[0.12]" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blush/[0.07]" />
      <div className="absolute left-1/2 top-1/2 size-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose/[0.08] blur-[80px]" />
      <svg
        viewBox="0 0 640 470"
        className="relative w-full drop-shadow-[0_0_36px_rgba(232,70,108,0.16)]"
        role="img"
        aria-label="Two glowing theatre seats with a heart between them"
      >
        <defs>
          <linearGradient id="seat-velvet" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#79304d" />
            <stop offset="1" stopColor="#351222" />
          </linearGradient>
          <linearGradient id="seat-glow" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#FFB3C6" />
            <stop offset="1" stopColor="#E8466C" />
          </linearGradient>
          <filter id="seat-blur">
            <feGaussianBlur stdDeviation="15" />
          </filter>
        </defs>
        <ellipse
          cx="320"
          cy="401"
          rx="230"
          ry="27"
          fill="#E8466C"
          opacity=".22"
          filter="url(#seat-blur)"
        />
        <g transform="translate(50 88)">
          <path
            d="M26 101c0-31 25-56 56-56h105c31 0 56 25 56 56v112H26V101Z"
            fill="url(#seat-velvet)"
            stroke="#FFB3C6"
            strokeOpacity=".65"
            strokeWidth="3"
          />
          <path
            d="M53 105c0-17 14-31 31-31h100c17 0 31 14 31 31v83H53v-83Z"
            fill="#1A0B14"
            fillOpacity=".55"
            stroke="#E8466C"
            strokeOpacity=".55"
            strokeWidth="2"
          />
          <rect
            x="8"
            y="213"
            width="253"
            height="54"
            rx="20"
            fill="url(#seat-velvet)"
            stroke="#E8466C"
            strokeOpacity=".68"
            strokeWidth="3"
          />
          <path
            d="M33 267v44m201-44v44"
            stroke="#FFB86B"
            strokeOpacity=".7"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M45 225h179"
            stroke="url(#seat-glow)"
            strokeOpacity=".6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(330 88)">
          <path
            d="M26 101c0-31 25-56 56-56h105c31 0 56 25 56 56v112H26V101Z"
            fill="url(#seat-velvet)"
            stroke="#FFB3C6"
            strokeOpacity=".65"
            strokeWidth="3"
          />
          <path
            d="M53 105c0-17 14-31 31-31h100c17 0 31 14 31 31v83H53v-83Z"
            fill="#1A0B14"
            fillOpacity=".55"
            stroke="#E8466C"
            strokeOpacity=".55"
            strokeWidth="2"
          />
          <rect
            x="8"
            y="213"
            width="253"
            height="54"
            rx="20"
            fill="url(#seat-velvet)"
            stroke="#E8466C"
            strokeOpacity=".68"
            strokeWidth="3"
          />
          <path
            d="M33 267v44m201-44v44"
            stroke="#FFB86B"
            strokeOpacity=".7"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M45 225h179"
            stroke="url(#seat-glow)"
            strokeOpacity=".6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(288 65)">
          <path
            d="M32 9c-8-10-26-7-28 8-3 20 28 39 28 39s31-19 28-39C58 2 40-1 32 9Z"
            fill="#E8466C"
            stroke="#FFB3C6"
            strokeWidth="3"
          />
          <path
            d="m4 75 6 12 12 6-12 6-6 12-6-12-12-6 12-6 6-12Zm92-20 4 8 9 4-9 4-4 9-4-9-9-4 9-4 4-8Z"
            fill="#FFB86B"
          />
        </g>
        <text
          x="320"
          y="435"
          textAnchor="middle"
          fill="#FFF4EC"
          fillOpacity=".55"
          fontSize="16"
          letterSpacing="4"
          fontFamily="sans-serif"
        >
          YOUR SEAT IS WAITING
        </text>
      </svg>
    </div>
  );
}

function RoomSeat({
  label,
  arrived,
}: {
  label: string;
  arrived: boolean;
}): JSX.Element {
  return (
    <motion.div
      layout
      aria-label={`${label}${arrived ? ', occupied' : ', waiting'}`}
      className={`relative mx-auto flex w-full max-w-40 flex-col items-center rounded-b-xl rounded-t-[2.25rem] border px-3 pb-3 pt-4 transition-colors ${
        arrived
          ? 'border-rose/40 bg-gradient-to-b from-rose/20 to-wine/40 shadow-[0_0_30px_rgb(232_70_108_/_0.17)]'
          : 'border-dashed border-white/15 bg-white/[0.02]'
      }`}
      animate={
        arrived ? { scale: 1, opacity: 1 } : { scale: 0.97, opacity: 0.66 }
      }
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <motion.span
        className={`mb-2 grid size-12 place-items-center rounded-full ${
          arrived
            ? 'bg-gradient-to-br from-rose to-wine text-cream'
            : 'border border-dashed border-white/20 text-cream/30'
        }`}
        animate={{ scale: arrived ? [0.8, 1.08, 1] : 1 }}
        transition={{ duration: 0.45 }}
      >
        {arrived ? (
          <Heart className="size-5 fill-current" aria-hidden="true" />
        ) : (
          <span className="text-lg">?</span>
        )}
      </motion.span>
      <span className="text-[0.65rem] text-cream/65">{label}</span>
      <span
        className={`mt-2 h-1.5 w-full rounded-full ${arrived ? 'bg-rose/55' : 'bg-white/10'}`}
      />
    </motion.div>
  );
}
