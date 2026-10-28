import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/auth-shell';
import { GoogleCallback } from '@/features/auth/email-actions';

export const metadata: Metadata = {
  title: 'Joining your seats',
  robots: { index: false, follow: false },
};

export default async function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string; error?: string }>;
}): Promise<JSX.Element> {
  const { code = '', state = '', error = '' } = await searchParams;
  return (
    <AuthShell
      eyebrow="Just a moment"
      title="Joining your seats"
      description="We’re bringing you back to your movie night."
      footer={<span>Your seat is always next to mine.</span>}
    >
      <GoogleCallback code={code} state={state} oauthError={error} />
    </AuthShell>
  );
}
