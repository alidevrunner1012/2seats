import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './chat-panel';

const emit = vi.fn();
const on = vi.fn();
const off = vi.fn();
const socket = { emit, on, off };
let sendResult = { ok: true };

vi.mock('./socket-provider', () => ({ useChatSocket: () => socket }));
vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
}));
vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: { user: { id: string; displayName: string } | null }) => unknown) =>
    selector({ user: { id: 'user-1', displayName: 'Avery' } }),
}));

describe('ChatPanel', () => {
  beforeEach(() => {
    emit.mockReset();
    on.mockReset();
    off.mockReset();
    sendResult = { ok: true };
    emit.mockImplementation((event: string, _payload: unknown, ack?: (result: { ok: boolean }) => void) => {
      if (event === 'chat:send' && ack) ack(sendResult);
    });
  });

  it('shows an optimistic message and replaces it after acknowledgement', async () => {
    render(<ChatPanel roomId="room-1" />);
    const input = await screen.findByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'Save me a seat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByText('Save me a seat')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Sending')).not.toBeInTheDocument());
    expect(emit).toHaveBeenCalledWith('chat:send', { roomId: 'room-1', content: 'Save me a seat' }, expect.any(Function));
  });

  it('shows failure and retries a message', async () => {
    sendResult = { ok: false };
    render(<ChatPanel roomId="room-1" />);
    const input = await screen.findByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'Please retry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Failed · retry')).toBeInTheDocument();
    sendResult = { ok: true };
    fireEvent.click(screen.getByRole('button', { name: 'Failed · retry' }));
    await waitFor(() => expect(emit.mock.calls.filter(([event]) => event === 'chat:send')).toHaveLength(2));
  });

  it('renders the typing indicator from the partner event', async () => {
    render(<ChatPanel roomId="room-1" />);
    const typingHandler = on.mock.calls.find(([event]) => event === 'chat:typing')?.[1] as
      | ((payload: { userId: string; isTyping: boolean }) => void)
      | undefined;
    expect(typingHandler).toBeDefined();
    typingHandler?.({ userId: 'user-2', isTyping: true });
    expect(await screen.findByText(/Someone is typing/)).toBeInTheDocument();
  });
});
