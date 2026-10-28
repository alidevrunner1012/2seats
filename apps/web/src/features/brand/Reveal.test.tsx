import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';

let observerCallback: IntersectionObserverCallback | undefined;
let observerInstance: TestObserver | undefined;

class TestObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
    observerInstance = this;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const originalObserver = globalThis.IntersectionObserver;

describe('Reveal', () => {
  afterEach(() => {
    globalThis.IntersectionObserver = originalObserver;
    observerCallback = undefined;
    observerInstance = undefined;
  });

  it('registers its viewport observer after the initial render', async () => {
    globalThis.IntersectionObserver = TestObserver;
    render(<Reveal>Close enough to share a screen</Reveal>);

    const element = screen
      .getByText('Close enough to share a screen')
      .closest('div[style]');
    expect(element).toHaveStyle({ opacity: '0' });

    await waitFor(() => expect(observerInstance?.observe).toHaveBeenCalled());
    const observer = observerInstance;
    const callback = observerCallback;
    if (element === null || observer === undefined || callback === undefined) {
      throw new Error('Reveal did not register its viewport observer.');
    }
    expect(observer.observe).toHaveBeenCalledWith(element);

    const entry: IntersectionObserverEntry = {
      boundingClientRect: new DOMRectReadOnly(),
      intersectionRatio: 1,
      intersectionRect: new DOMRectReadOnly(),
      isIntersecting: true,
      rootBounds: null,
      target: element,
      time: 0,
    };
    act(() => callback([entry], observer));
    expect(observer.unobserve).toHaveBeenCalledWith(element);
  });
});
