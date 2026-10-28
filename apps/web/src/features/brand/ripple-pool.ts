export interface RippleTarget {
  animate: (
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => Animation;
}

interface RippleSlot {
  target: RippleTarget;
  activeUntil: number;
}

export class RipplePool {
  private readonly slots: RippleSlot[];

  constructor(
    targets: readonly RippleTarget[],
    private readonly duration = 640,
  ) {
    this.slots = targets.slice(0, 5).map((target) => ({
      target,
      activeUntil: 0,
    }));
  }

  get size(): number {
    return this.slots.length;
  }

  spawn(x: number, y: number, now: number): boolean {
    const slot = this.slots.find((candidate) => candidate.activeUntil <= now);
    if (slot === undefined) {
      return false;
    }

    slot.activeUntil = now + this.duration;
    slot.target.animate(
      [
        {
          opacity: 0,
          transform: `translate3d(${x}px, ${y}px, 0) translate3d(-50%, -50%, 0) scale(0.25)`,
        },
        {
          opacity: 0.32,
          transform: `translate3d(${x}px, ${y}px, 0) translate3d(-50%, -50%, 0) scale(1)`,
        },
        {
          opacity: 0,
          transform: `translate3d(${x}px, ${y}px, 0) translate3d(-50%, -50%, 0) scale(1.75)`,
        },
      ],
      {
        duration: this.duration,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none',
      },
    );
    return true;
  }
}
