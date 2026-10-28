import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/auth-shell';
import { LoginForm } from '@/features/auth/auth-form';

export const metadata: Metadata = {
  title: 'Welcome back',
  robots: { index: false, follow: false },
};

export default function LoginPage(): JSX.Element {
  return (
    <AuthShell
      eyebrow="Your movie night is waiting"
      title="Welcome back"
      description="We saved your seat. Come on in and find your person."
      footer={
        <>
          New to 2Seats?{' '}
          <Link
            href="/signup"
            className="font-medium text-blush hover:text-cream"
          >
            Save your seat
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
