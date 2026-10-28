import type { Metadata } from 'next';
import { SettingsPage } from '@/features/auth/settings';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function SettingsRoute(): JSX.Element {
  return <SettingsPage />;
}
