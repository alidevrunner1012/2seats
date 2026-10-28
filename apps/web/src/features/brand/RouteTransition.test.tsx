import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteTransition } from './RouteTransition';

let currentPath = '/';
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
  useRouter: () => ({ push }),
}));

describe('RouteTransition', () => {
  afterEach(() => {
    currentPath = '/';
    push.mockClear();
  });

  it('follows pathname changes with the next route content', async () => {
    const { rerender } = render(
      <RouteTransition>
        <p>{currentPath === '/' ? 'Home seats' : 'Date-night details'}</p>
      </RouteTransition>,
    );
    expect(screen.getByText('Home seats')).toBeInTheDocument();

    currentPath = '/design';
    rerender(
      <RouteTransition>
        <p>{currentPath === '/' ? 'Home seats' : 'Date-night details'}</p>
      </RouteTransition>,
    );

    expect(await screen.findByText('Date-night details')).toBeInTheDocument();
  });

  it('waits for the outgoing transition before navigating an internal link', async () => {
    const { container } = render(
      <RouteTransition>
        <a href="/design">A little more detail</a>
      </RouteTransition>,
    );
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    container.querySelector('a')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(push).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/design'));
  });
});
