import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteForm } from './invite-form';
import { useSessionStore } from '@/store/session-store';
import { useToastStore } from '@/hooks/use-toast';

describe('InviteForm', () => {
  beforeEach(() => {
    useSessionStore.setState({ displayName: null });
    useToastStore.setState({ toasts: [] });
  });

  it('validates required values before joining', async () => {
    const user = userEvent.setup();
    render(<InviteForm />);
    await user.click(screen.getByRole('button', { name: 'Join your room' }));

    expect(
      await screen.findByText('Tell us what to call you'),
    ).toBeInTheDocument();
    expect(screen.getByText('Add the room invite code')).toBeInTheDocument();
    expect(useSessionStore.getState().displayName).toBeNull();
  });

  it('stores the name and shows a warm success toast on submit', async () => {
    const user = userEvent.setup();
    render(<InviteForm />);
    await user.type(screen.getByLabelText('Your name'), 'Avery');
    await user.type(screen.getByLabelText('Room invite code'), 'cozy-night');
    await user.click(screen.getByRole('button', { name: 'Join your room' }));

    await waitFor(() => {
      expect(useSessionStore.getState().displayName).toBe('Avery');
    });
    expect(useToastStore.getState().toasts[0]?.title).toBe(
      'Your seats are saved',
    );
  });
});
