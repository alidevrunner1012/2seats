import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  InteractionFooterLink,
  InteractionProvider,
} from './InteractionProvider';
import { SPLASH_SESSION_KEY } from './splash-state';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

describe('InteractionProvider', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('keeps sound and cursor glow off by default and exposes their settings toggles', async () => {
    sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    render(
      <InteractionProvider>
        <p>Movie night</p>
        <InteractionFooterLink />
      </InteractionProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'UI sounds off' }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'UI sounds off' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Cursor glow off' }),
    ).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'UI sounds off' }));
    expect(
      screen.getByRole('button', { name: 'UI sounds on' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replay intro' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
