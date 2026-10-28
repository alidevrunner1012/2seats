import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { Avatar, AvatarFallback } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { HeartLoader, SeatsLoader } from './loaders';
import { Skeleton } from './skeleton';
import { Slider } from './slider';
import { Switch } from './switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Tooltip } from './tooltip';
import { ToastViewport } from './toast';
import { useToastStore } from '@/hooks/use-toast';

function PrimitivesShowcase(): JSX.Element {
  return (
    <>
      <Badge variant="amber">Date night</Badge>
      <Avatar>
        <AvatarFallback>AV</AvatarFallback>
      </Avatar>
      <Tabs defaultValue="first">
        <TabsList>
          <TabsTrigger value="first">First tab</TabsTrigger>
          <TabsTrigger value="second">Second tab</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First panel</TabsContent>
        <TabsContent value="second">Second panel</TabsContent>
      </Tabs>
      <Slider aria-label="Movie volume" defaultValue={[30]} max={100} />
      <Switch aria-label="Movie reminders" />
      <Tooltip content="A cozy note">
        <Button>Show a note</Button>
      </Tooltip>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open the invite</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Your seats are waiting</DialogTitle>
          <DialogDescription>
            Save a seat for your favorite person.
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <HeartLoader />
      <SeatsLoader />
      <Skeleton data-testid="loading-skeleton" />
      <ToastViewport />
    </>
  );
}

describe('base UI components', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renders badges, avatars, skeletons, and date-night loaders', () => {
    render(<PrimitivesShowcase />);

    expect(screen.getByText('Date night')).toBeInTheDocument();
    expect(screen.getByText('AV')).toBeInTheDocument();
    expect(screen.getByTestId('loading-skeleton')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(
      screen.getByRole('status', { name: 'Preparing your date night' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Saving two seats' }),
    ).toBeInTheDocument();
  });

  it('animates tabs and responds to switch and slider input', async () => {
    const user = userEvent.setup();
    render(<PrimitivesShowcase />);

    await user.click(screen.getByRole('tab', { name: 'Second tab' }));
    expect(screen.getByRole('tab', { name: 'Second tab' })).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(screen.getByText('Second panel')).toBeVisible();

    const switchControl = screen.getByRole('switch', {
      name: 'Movie reminders',
    });
    expect(switchControl).toHaveAttribute('data-state', 'unchecked');
    await user.click(switchControl);
    expect(switchControl).toHaveAttribute('data-state', 'checked');

    const slider = screen.getByRole('slider', { name: 'Movie volume' });
    slider.focus();
    fireEvent.keyDown(slider, { key: 'End' });
    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '100'));
  });

  it('opens and closes the spring dialog and reveals tooltip and toast feedback', async () => {
    const user = userEvent.setup();
    render(<PrimitivesShowcase />);

    await user.hover(screen.getByRole('button', { name: 'Show a note' }));
    expect(await screen.findByText('A cozy note')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open the invite' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your seats are waiting' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    useToastStore.getState().show({ title: 'Invite link copied' });
    expect(await screen.findByText('Invite link copied')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Invite link copied')).not.toBeInTheDocument(),
    );
  });
});
