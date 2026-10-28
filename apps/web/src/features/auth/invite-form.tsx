'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fadeUp, stagger } from '@/lib/motion';
import { useSessionStore } from '@/store/session-store';

const inviteSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you').max(40),
  inviteCode: z.string().trim().min(4, 'Add the room invite code').max(32),
});

type InviteValues = z.infer<typeof inviteSchema>;

export function InviteForm(): JSX.Element {
  const show = useToast();
  const setDisplayName = useSessionStore((state) => state.setDisplayName);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { displayName: '', inviteCode: '' },
  });

  const onSubmit = handleSubmit(({ displayName, inviteCode }) => {
    setDisplayName(displayName);
    show({
      title: 'Your seats are saved',
      description: `Ready to join room ${inviteCode}.`,
    });
  });

  return (
    <motion.form
      onSubmit={onSubmit}
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <motion.div variants={fadeUp}>
        <Input
          label="Your name"
          autoComplete="nickname"
          aria-invalid={Boolean(errors.displayName)}
          {...register('displayName')}
        />
        {errors.displayName && (
          <p role="alert" className="mt-1.5 px-2 text-xs text-blush">
            {errors.displayName.message}
          </p>
        )}
      </motion.div>
      <motion.div variants={fadeUp}>
        <Input
          label="Room invite code"
          autoComplete="off"
          aria-invalid={Boolean(errors.inviteCode)}
          {...register('inviteCode')}
        />
        {errors.inviteCode && (
          <p role="alert" className="mt-1.5 px-2 text-xs text-blush">
            {errors.inviteCode.message}
          </p>
        )}
      </motion.div>
      <motion.div variants={fadeUp}>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving your seats…' : 'Join your room'}
        </Button>
      </motion.div>
    </motion.form>
  );
}
