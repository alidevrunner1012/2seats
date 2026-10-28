'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarHeart,
  Clapperboard,
  Clock3,
  Film,
  Heart,
  Link2,
  LogOut,
  Plus,
  Settings2,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FormEvent } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthGate } from '@/features/auth/auth-gate';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { fadeUp, stagger } from '@/lib/motion';
import { useToast } from '@/hooks/use-toast';

interface RoomSummary {
  id: string;
  name: string;
  inviteCode: string;
  role: 'HOST' | 'PARTICIPANT';
  createdAt: string;
  members: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  lastMovieTitle: string | null;
}

interface NextDate {
  id: string;
  roomId: string;
  scheduledFor: string;
  note: string | null;
}

const joinSchema = z.object({
  invite: z.string().trim().min(4, 'Add a room code or invite link').max(512),
});
const roomSchema = z.object({
  name: z.string().trim().min(2, 'Give your date a name').max(80),
});
const plannedDateKey = '2seats:planned-date';

export function Dashboard(): JSX.Element {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent(): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const showToast = useToast();
  const router = useRouter();
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedDateInput, setPlannedDateInput] = useState('');
  const [countdown, setCountdown] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  useEffect(() => {
    const savedDate = window.localStorage.getItem(plannedDateKey);
    if (savedDate !== null && Number.isFinite(Date.parse(savedDate))) {
      setPlannedDate(savedDate);
      setPlannedDateInput(new Date(savedDate).toISOString().slice(0, 16));
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<RoomSummary[]>('/rooms/recent')
      .then((result) => {
        if (active) setRooms(result);
      })
      .catch(() => {
        if (active) {
          showToast({
            title: 'Your room shelf is taking a moment',
            description: 'Try refreshing if your recent dates do not appear.',
          });
        }
      })
      .finally(() => {
        if (active) setRoomsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  useEffect(() => {
    let active = true;
    apiFetch<NextDate | null>('/me/next-date')
      .then((date) => {
        if (active && date !== null) {
          setPlannedDate(date.scheduledFor);
          setPlannedDateInput(
            new Date(date.scheduledFor).toISOString().slice(0, 16),
          );
        }
      })
      .catch((error: unknown) => {
        if (active && error instanceof Error && error.message !== '') {
          showToast({
            title: 'Your next date is still safe',
            description: 'We could not load the shared countdown just now.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  useEffect(() => {
    const updateCountdown = (): void => {
      if (plannedDate === '') {
        setCountdown(null);
        return;
      }
      const remaining = Date.parse(plannedDate) - Date.now();
      if (remaining <= 0) {
        setCountdown('Your date night is here.');
        return;
      }
      const days = Math.floor(remaining / 86_400_000);
      const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
      setCountdown(`${days} days, ${hours} hours to go`);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 60_000);
    return () => window.clearInterval(timer);
  }, [plannedDate]);

  const greeting = useMemo(
    () => user?.displayName.trim().split(/\s+/)[0] ?? 'friend',
    [user?.displayName],
  );

  const logout = async (): Promise<void> => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
      clear();
      router.replace('/login');
    } catch (error) {
      showToast({
        title: 'We couldn’t sign you out',
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const joinForm = useForm<z.infer<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
    defaultValues: { invite: '' },
  });
  const submitJoin = joinForm.handleSubmit(async ({ invite }) => {
    setJoinMessage(null);
    try {
      const room = await apiFetch<RoomSummary>('/rooms/join', {
        method: 'POST',
        body: { invite },
      });
      setRooms((current) => [
        room,
        ...current.filter((item) => item.id !== room.id),
      ]);
      setJoinMessage(`You’re in "${room.name}". Your seat is ready.`);
      joinForm.reset();
    } catch (error) {
      setJoinMessage(
        error instanceof Error
          ? error.message
          : 'That invite could not be opened.',
      );
    }
  });

  const saveDate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get('date') ?? '');
    if (date === '' || !Number.isFinite(Date.parse(date))) return;
    const isoDate = new Date(date).toISOString();
    const room = rooms[0];
    if (room === undefined) {
      showToast({
        title: 'Create a room first',
        description: 'Your next date needs a shared room to live in.',
      });
      return;
    }
    const previousDate = plannedDate;
    const previousDateInput = plannedDateInput;
    window.localStorage.setItem(plannedDateKey, isoDate);
    setPlannedDate(isoDate);
    setPlannedDateInput(date);
    try {
      await apiFetch(`/rooms/${room.id}/dates`, {
        method: 'POST',
        body: { scheduledFor: isoDate },
      });
      showToast({
        title: 'Date saved',
        description: `Your next date is set in "${room.name}".`,
      });
    } catch (error) {
      setPlannedDate(previousDate);
      setPlannedDateInput(previousDateInput);
      if (previousDate === '') window.localStorage.removeItem(plannedDateKey);
      else window.localStorage.setItem(plannedDateKey, previousDate);
      showToast({
        title: 'We could not save that date',
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const createForm = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: { name: '' },
  });

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-7xl px-5 pb-16 pt-8 sm:px-10 sm:pt-12">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-blush/65">
            Your little corner
          </p>
          <h1 className="type-display-page mt-2 text-cream">Hi, {greeting}</h1>
          <p className="mt-2 text-sm text-cream/55">
            Ready to make a little movie magic?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid size-11 place-items-center rounded-full border border-white/10 text-cream/70 hover:border-rose/40 hover:text-cream"
          >
            <Settings2 className="size-4" aria-hidden="true" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="glass relative overflow-hidden rounded-[2rem] p-6 shadow-rose sm:p-9"
        aria-labelledby="create-date-heading"
      >
        <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-rose/10 blur-[80px]" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-rose/15 text-blush">
              <Clapperboard className="size-5" aria-hidden="true" />
            </div>
            <h2
              id="create-date-heading"
              className="type-display-section text-cream"
            >
              Create a Date Room
            </h2>
            <p className="mt-2 text-sm leading-6 text-cream/60">
              Pick a film, save two seats, and send your person an invite.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="size-4" aria-hidden="true" />
                Create a date room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Make it a movie night</DialogTitle>
              <DialogDescription>
                Give your date room a name, then send the invite to your person.
              </DialogDescription>
              <form
                className="mt-5 space-y-4"
                onSubmit={createForm.handleSubmit(async ({ name }) => {
                  setCreateMessage(null);
                  try {
                    const room = await apiFetch<RoomSummary>('/rooms', {
                      method: 'POST',
                      body: { name },
                    });
                    setRooms((current) => [
                      room,
                      ...current.filter((item) => item.id !== room.id),
                    ]);
                    setCreateOpen(false);
                    createForm.reset();
                    showToast({
                      title: 'Your room is ready',
                      description: `Invite code: ${room.inviteCode}`,
                    });
                  } catch (error) {
                    setCreateMessage(
                      error instanceof Error
                        ? error.message
                        : 'We could not create that room.',
                    );
                  }
                })}
              >
                <Input
                  label="Date room name"
                  {...createForm.register('name')}
                />
                {createForm.formState.errors.name && (
                  <p role="alert" className="text-xs text-blush">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
                {createMessage && (
                  <p role="status" className="text-sm text-blush">
                    {createMessage}
                  </p>
                )}
                <Button className="w-full" type="submit">
                  Save our seats
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section
          className="glass rounded-3xl p-6 sm:p-7"
          aria-labelledby="join-heading"
        >
          <div className="mb-5 flex items-center gap-3">
            <Ticket className="size-5 text-candle" aria-hidden="true" />
            <h2 id="join-heading" className="type-display-card text-cream">
              Join with a code or link
            </h2>
          </div>
          <form
            onSubmit={submitJoin}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="min-w-0 flex-1">
              <Input
                label="Room invite code or link"
                autoComplete="off"
                aria-invalid={Boolean(joinForm.formState.errors.invite)}
                {...joinForm.register('invite')}
              />
            </div>
            <Button type="submit" variant="glass">
              Join a seat
            </Button>
          </form>
          {joinForm.formState.errors.invite && (
            <p role="alert" className="mt-2 text-xs text-blush">
              {joinForm.formState.errors.invite.message}
            </p>
          )}
          {joinMessage && (
            <p role="status" className="mt-3 text-sm text-blush">
              {joinMessage}
            </p>
          )}
        </section>

        <section
          className="glass rounded-3xl p-6 sm:p-7"
          aria-labelledby="next-date-heading"
        >
          <div className="mb-4 flex items-center gap-3">
            <CalendarHeart className="size-5 text-blush" aria-hidden="true" />
            <h2 id="next-date-heading" className="type-display-card text-cream">
              Next date
            </h2>
          </div>
          {plannedDate !== '' && (
            <motion.p
              className="mb-4 flex items-center gap-2 text-sm text-candle"
              role="timer"
              animate={
                reducedMotion ? { opacity: 1 } : { opacity: [0.82, 1, 0.82] }
              }
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <Clock3 className="size-4" aria-hidden="true" />
              {countdown ?? 'Counting down to your date…'}
            </motion.p>
          )}
          <form onSubmit={saveDate} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="planned-date">
              Choose your date and time
            </label>
            <input
              id="planned-date"
              name="date"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={plannedDateInput}
              onChange={(event) => setPlannedDateInput(event.target.value)}
              required
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-rose/20 bg-midnight/60 px-4 text-sm text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
            />
            <Button type="submit" variant="glass">
              Save date
            </Button>
          </form>
        </section>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mt-8 grid gap-6 md:grid-cols-2"
      >
        <motion.section
          variants={fadeUp}
          className="glass min-h-52 rounded-3xl p-6 sm:p-7"
          aria-labelledby="recent-heading"
        >
          <div className="mb-5 flex items-center gap-3">
            <Link2 className="size-5 text-blush" aria-hidden="true" />
            <h2 id="recent-heading" className="type-display-card text-cream">
              Recent rooms
            </h2>
          </div>
          {roomsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="grid min-h-28 place-items-center text-center">
              <div>
                <Heart
                  className="mx-auto mb-2 size-6 fill-rose/20 text-rose/60"
                  aria-hidden="true"
                />
                <p className="text-sm text-cream/60">
                  No dates yet. Your seat is waiting.
                </p>
                <p className="mt-1 text-xs text-cream/35">
                  Create a room to make room for someone special.
                </p>
              </div>
            </div>
          ) : (
            <motion.ul
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {rooms.map((room) => (
                <motion.li
                  key={room.id}
                  variants={fadeUp}
                  className="rounded-2xl border border-white/10 bg-midnight/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-cream">{room.name}</p>
                      <p className="mt-1 text-xs text-cream/45">
                        {room.members
                          .map((member) => member.displayName)
                          .join(' · ')}
                        {room.lastMovieTitle
                          ? ` · ${room.lastMovieTitle}`
                          : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose/10 px-2 py-1 text-[10px] uppercase tracking-wider text-blush">
                      {room.inviteCode}
                    </span>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.section>
        <motion.section
          variants={fadeUp}
          className="glass min-h-52 rounded-3xl p-6 sm:p-7"
          aria-labelledby="memories-heading"
        >
          <div className="mb-5 flex items-center gap-3">
            <Film className="size-5 text-candle" aria-hidden="true" />
            <h2 id="memories-heading" className="type-display-card text-cream">
              Movies we watched
            </h2>
          </div>
          <div className="grid min-h-28 place-items-center text-center">
            <p className="max-w-xs text-sm leading-6 text-cream/50">
              Your shared movie memories will gather here after your first date.
            </p>
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
