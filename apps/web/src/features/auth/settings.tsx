'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Languages,
  MoonStar,
  UserRound,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AuthGate } from '@/features/auth/auth-gate';
import { useInteractionSettings } from '@/features/brand/InteractionProvider';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/store/auth-store';
import { usePreferenceStore } from '@/store/preference-store';

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Use at least 2 characters').max(40),
});

export function SettingsPage(): JSX.Element {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}

function SettingsContent(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { cursorEnabled, soundEnabled, setCursorEnabled, setSoundEnabled } =
    useInteractionSettings();
  const { language, reducedMotionEnabled, update } = usePreferenceStore();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.displayName ?? '' },
  });

  const saveProfile = handleSubmit(async (values) => {
    setError(null);
    setNotice(null);
    try {
      const updated = await apiFetch<AuthUser>('/users/me', {
        method: 'PATCH',
        body: values,
      });
      setUser(updated);
      setNotice('Your profile is saved. Looking lovely.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save your profile.',
      );
    }
  });

  const uploadAvatar = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    if (file === undefined) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    setError(null);
    setNotice(null);
    setUploadingAvatar(true);
    try {
      const upload = await apiFetch<{
        uploadUrl: string;
        objectKey: string;
      }>('/users/me/avatar/presign', {
        method: 'POST',
        body: { contentType: file.type, sizeBytes: file.size },
      });
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Avatar upload failed with status ${response.status}`);
      }
      const updated = await apiFetch<AuthUser>('/users/me/avatar/complete', {
        method: 'POST',
        body: { objectKey: upload.objectKey },
      });
      setUser(updated);
      setNotice('Your new photo is saved.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not upload your photo.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-4xl px-5 pb-24 pt-8 sm:px-10 sm:pb-16 sm:pt-12">
      <Link
        href="/dashboard"
        className="mb-7 inline-flex items-center gap-2 text-sm text-cream/55 hover:text-cream"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to your seats
      </Link>
      <p className="text-xs uppercase tracking-[0.22em] text-blush/65">
        Make it yours
      </p>
      <h1 className="type-display-page mt-2 text-cream">Settings</h1>

      <div className="mt-8 space-y-5">
        <section
          className="glass rounded-3xl p-6 sm:p-8"
          aria-labelledby="profile-title"
        >
          <div className="mb-6 flex items-center gap-3">
            <UserRound className="size-5 text-blush" aria-hidden="true" />
            <h2 id="profile-title" className="type-display-card text-cream">
              Your profile
            </h2>
          </div>
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>
                {user?.displayName.slice(0, 1) ?? '2'}
              </AvatarFallback>
            </Avatar>
            <div>
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer text-sm font-medium text-blush hover:text-cream"
              >
                {uploadingAvatar ? 'Saving your photo…' : 'Change photo'}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={uploadingAvatar}
                onChange={(event) => void uploadAvatar(event)}
              />
              <p className="mt-1 text-xs text-cream/40">
                JPG, PNG or WebP · up to 5 MB
              </p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <Input
              label="Display name"
              autoComplete="name"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p role="alert" className="text-xs text-blush">
                {errors.displayName.message}
              </p>
            )}
            <Input
              label="Email address"
              type="email"
              value={user?.email ?? ''}
              disabled
            />
            {error && (
              <p role="alert" className="text-sm text-blush">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-candle">
                {notice}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </section>

        <section
          className="glass rounded-3xl p-6 sm:p-8"
          aria-labelledby="preferences-title"
        >
          <h2
            id="preferences-title"
            className="type-display-card mb-5 text-cream"
          >
            Little preferences
          </h2>
          <div className="divide-y divide-white/10">
            <PreferenceRow
              icon={<Languages className="size-4" aria-hidden="true" />}
              title="Language"
              description="Choose the language for your 2Seats experience."
            >
              <select
                aria-label="Language"
                value={language}
                onChange={(event) =>
                  update({
                    language: event.target.value === 'hi' ? 'hi' : 'en',
                  })
                }
                className="min-h-10 rounded-xl border border-rose/20 bg-midnight px-3 text-sm text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </PreferenceRow>
            <PreferenceRow
              icon={<Volume2 className="size-4" aria-hidden="true" />}
              title="Soft sounds"
              description="A little click and pop when you move around."
            >
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                aria-label="Soft sounds"
              />
            </PreferenceRow>
            <PreferenceRow
              icon={<UserRound className="size-4" aria-hidden="true" />}
              title="Cursor glow"
              description="A gentle glow follows your pointer on desktop."
            >
              <Switch
                checked={cursorEnabled}
                onCheckedChange={setCursorEnabled}
                aria-label="Cursor glow"
              />
            </PreferenceRow>
            <PreferenceRow
              icon={<MoonStar className="size-4" aria-hidden="true" />}
              title="Reduce motion"
              description="Keep the interface still and gentle."
            >
              <Switch
                checked={reducedMotionEnabled}
                onCheckedChange={(checked) =>
                  update({ reducedMotionEnabled: checked })
                }
                aria-label="Reduce motion"
              />
            </PreferenceRow>
          </div>
        </section>
      </div>
    </main>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-blush">{icon}</span>
        <div>
          <p className="text-sm font-medium text-cream">{title}</p>
          <p className="mt-1 text-xs leading-5 text-cream/45">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
