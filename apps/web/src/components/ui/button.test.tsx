import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders its label and responds to activation', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save us two seats</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Save us two seats' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('supports disabled states accessibly', () => {
    render(<Button disabled>Not yet</Button>);

    expect(screen.getByRole('button', { name: 'Not yet' })).toBeDisabled();
  });
});
