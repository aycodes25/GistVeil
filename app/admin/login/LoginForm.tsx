'use client';

import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { useActionState, useState } from 'react';
import { login, type LoginState } from '@/app/admin/actions/auth';
import { Button } from '@/components/ui/Button';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="mt-[62px] flex flex-col">
      {/* Visually hidden username so a password manager can save and fill this login. */}
      <input
        type="text"
        name="username"
        defaultValue="admin"
        autoComplete="username"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <label htmlFor="password" className="text-sm font-medium text-ink">
        Secret Key
      </label>
      <div className="relative mt-2">
        <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body" />
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          autoFocus
          placeholder="Enter your secret key"
          className="h-12 w-full rounded-xl bg-login-field pr-12 pl-11 text-sm text-ink placeholder:text-body focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide secret key' : 'Show secret key'}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-body transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-7 w-full">
        {pending ? 'Signing in…' : 'Authorize Access'}
        {!pending && <ArrowRight aria-hidden className="size-4" />}
      </Button>
    </form>
  );
}
