import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);
vi.stubGlobal('scrollTo', vi.fn());

class IntersectionObserverMock implements IntersectionObserver {
  private observedTarget: Element | null = null;
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];

  disconnect(): void {
    this.observedTarget = null;
  }

  observe(target: Element): void {
    this.observedTarget = target;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(target: Element): void {
    if (this.observedTarget === target) {
      this.observedTarget = null;
    }
  }
}

globalThis.IntersectionObserver = IntersectionObserverMock;

class ResizeObserverMock implements ResizeObserver {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverMock;
