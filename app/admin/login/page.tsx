import type { Metadata } from 'next';
import { Logo } from '@/components/ui/Logo';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin sign in · GistVeil',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-login-page px-4 py-10 font-sans text-ink [color-scheme:light]">
      <div className="w-full max-w-[448px]">
        <header className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Logo height={56} eager />
            <span className="font-heading text-[32px] leading-10 font-semibold tracking-[-0.01em] text-white">Admin</span>
          </div>
          <p className="mt-2 text-base text-white">Secure Control Room Access</p>
        </header>

        <div className="mt-6 rounded-2xl bg-login-card px-6 pt-10 pb-8 shadow-2xl sm:px-8 sm:pt-[82px]">
          <h1 className="font-heading text-2xl leading-8 font-semibold text-ink">Administrator Sign In</h1>
          <p className="mt-7 text-sm leading-5 text-ink-2">
            Please enter your credentials to access the moderation dashboard.
          </p>

          <LoginForm />

          <hr className="mt-8 border-black/5" />
          <p className="mt-6 rounded-xl bg-login-note px-4 py-4 text-center text-sm leading-5 text-ink-2 italic">
            &ldquo;Only authorized administrators are permitted to enter this secure zone. Failed sign-in attempts
            are recorded, and repeated failures lock the login.&rdquo;
          </p>
        </div>
      </div>
    </main>
  );
}
