import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/auth-shell';
import { SignupForm } from '@/features/auth/auth-form';

export const metadata: Metadata = {
  title: 'Save your seat',
  robots: { index: false, follow: false },
};

export default function SignupPage(): JSX.Element {
  return (
    <AuthShell
      eyebrow="A little movie magic, just for two"
      title="Save your seat"
      description="Make room for your favorite person, wherever they are."
      footer={
        <>
          Already have a seat?{' '}
          <Link
            href="/login"
            className="font-medium text-blush hover:text-cream"
          >
            Welcome back
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
