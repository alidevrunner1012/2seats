import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractionProvider } from '@/features/brand/InteractionProvider';
import LandingPage from './landing-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

describe('LandingPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('2seats:intro-seen', 'true');
  });

  it('shows the date-night promise and signup navigation', () => {
    render(
      <InteractionProvider>
        <LandingPage />
      </InteractionProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Your seat is always next to mine.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Start a date night' }),
    ).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      screen.getByRole('link', { name: 'See how it works' }),
    ).toHaveAttribute('href', '#how-it-works');
  });

  it('explains all watch modes and gives honest subscription guidance', () => {
    render(
      <InteractionProvider>
        <LandingPage />
      </InteractionProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Three ways to watch' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Netflix, Hotstar etc: use Screen Share/),
    ).toBeInTheDocument();
    expect(screen.getByText(/DRM/)).toBeInTheDocument();
  });

  it('opens and closes FAQ answers with keyboard-accessible controls', async () => {
    const user = userEvent.setup();
    render(
      <InteractionProvider>
        <LandingPage />
      </InteractionProvider>,
    );

    const question = screen.getByRole('button', {
      name: 'Can we watch Netflix or Hotstar together?',
    });
    expect(question).toHaveAttribute('aria-expanded', 'false');

    question.focus();
    await user.keyboard('{Enter}');

    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('region', {
        name: 'Can we watch Netflix or Hotstar together?',
      }),
    ).toHaveTextContent(/Screen Share with your own subscriptions/);

    await user.keyboard(' ');
    expect(question).toHaveAttribute('aria-expanded', 'false');
    expect(
      document.getElementById(question.getAttribute('aria-controls') ?? ''),
    ).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces the partner seat as they arrive in the room preview', async () => {
    const user = userEvent.setup();
    render(
      <InteractionProvider>
        <LandingPage />
      </InteractionProvider>,
    );

    expect(screen.getByLabelText('Their seat, waiting')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See them arrive' }));

    expect(screen.getByLabelText('Their seat, occupied')).toBeInTheDocument();
    expect(
      screen.getByText('They made it. Save them the best seat.'),
    ).toBeInTheDocument();
  });
});
