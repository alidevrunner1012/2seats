import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/auth-shell';
import { RequestResetForm } from '@/features/auth/recovery-form';

export const metadata: Metadata = { title: 'Find your seat again' };

export default function ForgotPasswordPage(): JSX.Element {
  return (
    <AuthShell
      eyebrow="It happens to the best of us"
      title="Find your seat again"
      description="Share your email and we’ll send a safe little link to reset your password."
      footer={
        <Link href="/login" className="font-medium text-blush hover:text-cream">
          Back to sign in
        </Link>
      }
    >
      <RequestResetForm />
    </AuthShell>
  );
}
