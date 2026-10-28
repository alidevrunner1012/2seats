import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/auth-shell';
import { ResetPasswordForm } from '@/features/auth/recovery-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<JSX.Element> {
  const { token = '' } = await searchParams;
  return (
    <AuthShell
      eyebrow="A fresh start"
      title="Choose a new password"
      description="Pick a strong password and we’ll keep your seat safe."
      footer={
        <Link href="/login" className="font-medium text-blush hover:text-cream">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
