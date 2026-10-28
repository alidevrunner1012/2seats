import { redirect } from 'next/navigation';

export default function LegacyLoginPage(): never {
  redirect('/login');
}
