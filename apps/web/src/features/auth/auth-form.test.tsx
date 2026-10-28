import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { LoginForm, SignupForm } from './auth-form';

const { apiFetchMock, replaceMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  ApiError: class ApiError extends Error {},
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe('authentication forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates sign-up fields and sends only API-supported values', async () => {
    apiFetchMock.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'avery@example.com',
        displayName: 'Avery',
        avatarUrl: null,
        emailVerified: false,
      },
    });
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText('What should we call you?'), {
      target: { value: 'Avery' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'avery@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Create a password'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText('One more time'), {
      target: { value: 'short' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create your account' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose at least 12 characters',
    );
    expect(apiFetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Create a password'), {
      target: { value: 'AveryDateNight2026!' },
    });
    fireEvent.change(screen.getByLabelText('One more time'), {
      target: { value: 'AveryDateNight2026!' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create your account' }),
    );
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/auth/signup', {
        method: 'POST',
        body: {
          displayName: 'Avery',
          email: 'avery@example.com',
          password: 'AveryDateNight2026!',
        },
      });
      expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('surfaces sign-in errors inline without losing the form', async () => {
    apiFetchMock.mockRejectedValue(
      new ApiError('Too many sign-in attempts.', 429),
    );
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'avery@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Welcome back' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many sign-in attempts.',
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
