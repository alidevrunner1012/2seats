import type { Transition, Variants } from 'framer-motion';

export const motionDurations = {
  instant: 0.12,
  quick: 0.2,
  gentle: 0.35,
  slow: 0.55,
} as const;

export const motionEasings = {
  dateNight: [0.22, 1, 0.36, 1] as const,
  soft: [0.4, 0, 0.2, 1] as const,
};

export const springs = {
  soft: { type: 'spring', stiffness: 260, damping: 24 } satisfies Transition,
  playful: { type: 'spring', stiffness: 360, damping: 18 } satisfies Transition,
  dialog: { type: 'spring', stiffness: 300, damping: 28 } satisfies Transition,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.gentle,
      ease: motionEasings.dateNight,
    },
  },
  exit: { opacity: 0, y: 8, transition: { duration: motionDurations.quick } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motionDurations.gentle } },
  exit: { opacity: 0, transition: { duration: motionDurations.quick } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: springs.dialog },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: motionDurations.quick },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(5px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.32, ease: motionEasings.dateNight },
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: 'blur(4px)',
    transition: { duration: 0.2, ease: motionEasings.soft },
  },
};

export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const pressable: Variants = {
  idle: { scale: 1 },
  press: { scale: 0.96, transition: springs.playful },
};

export const hoverLift: Variants = {
  idle: { y: 0, transition: springs.soft },
  hover: { y: -3, transition: springs.soft },
};

export const tiltCard: Variants = {
  idle: { y: 0, rotateX: 0, rotateY: 0, scale: 1 },
  hover: {
    y: -5,
    rotateX: -1.5,
    rotateY: 1.5,
    scale: 1.01,
    transition: springs.soft,
  },
  press: { scale: 0.96, transition: springs.playful },
};
