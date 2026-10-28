import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/auth-shell';
import { VerifyEmail } from '@/features/auth/email-actions';

export const metadata: Metadata = {
  title: 'Verify your email',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<JSX.Element> {
  const { token = '' } = await searchParams;
  return (
    <AuthShell
      eyebrow="One tiny step"
      title="Confirm your email"
      description="A verified email helps us keep your account and movie nights safe."
      footer={
        <Link
          href="/dashboard"
          className="font-medium text-blush hover:text-cream"
        >
          Head to your seats
        </Link>
      }
    >
      <VerifyEmail token={token} />
    </AuthShell>
  );
}
