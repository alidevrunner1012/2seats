import type { Metadata } from 'next';
import { Dashboard } from '@/features/auth/dashboard';

export const metadata: Metadata = {
  title: 'Your seats',
  robots: { index: false, follow: false },
};

export default function DashboardPage(): JSX.Element {
  return <Dashboard />;
}
