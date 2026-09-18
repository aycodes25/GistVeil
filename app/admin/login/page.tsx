import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin sign in · GistVeil',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-white">GistVeil Admin</h1>
      <p className="mb-6 text-sm text-neutral-400">Sign in to moderate.</p>
      <LoginForm />
    </main>
  );
}
