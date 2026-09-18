'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/admin/actions/auth';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
      <label htmlFor="password" className="text-sm text-neutral-400">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-neutral-100"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-purple-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
