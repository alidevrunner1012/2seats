import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Splash, SplashGate } from './Splash';
import { SPLASH_SESSION_KEY } from './splash-state';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

describe('Splash', () => {
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('gracefully fast-forwards when the visitor clicks or presses a key', () => {
    const onComplete = vi.fn();
    const first = render(<Splash onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('status'));
    expect(
      screen.getByText('Bringing your seats a little closer…'),
    ).toBeInTheDocument();
    first.unmount();

    render(<Splash onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(
      screen.getByText('Bringing your seats a little closer…'),
    ).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('uses the one-second reduced-motion presentation', () => {
    render(<Splash onComplete={vi.fn()} reducedMotionOverride />);

    expect(screen.getByRole('status')).toHaveAttribute(
      'data-motion-mode',
      'reduced',
    );
    expect(
      screen.getByLabelText('Your seat is always next to mine.'),
    ).toBeInTheDocument();
  });

  it('marks the intro as seen once per browser session and skips on the next mount', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    const first = render(<SplashGate storage={storage} />);
    await screen.findByRole('status');
    expect(values.get(SPLASH_SESSION_KEY)).toBe('true');
    first.unmount();

    const second = render(<SplashGate storage={storage} />);
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    second.unmount();
  });
});
