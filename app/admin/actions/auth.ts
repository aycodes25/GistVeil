'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { endAdminSession, startAdminSession } from '@/lib/admin/auth';
import { clearFailures, recentFailureCount, recordFailure } from '@/lib/admin/loginAttempts';
import { loadAdminConfig, passwordMatches } from '@/lib/admin/session';
import { clientIp, isThrottled } from '@/lib/admin/throttle';

export interface LoginState {
  error?: string;
}

const UNAVAILABLE = "Couldn't sign in right now. Try again later.";

function logError(context: string, error: unknown) {
  console.error(`[admin] ${context}:`, error instanceof Error ? error.message : error);
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  // Fail closed: a missing or weak ADMIN_* env var means nobody can sign in.
  let config;
  try {
    config = loadAdminConfig(process.env);
  } catch (error) {
    logError('login unavailable', error);
    return { error: UNAVAILABLE };
  }

  const ip = clientIp((await headers()).get('x-forwarded-for'));

  // Fail closed again: if the throttle can't be read, don't accept password guesses.
  let recentFailures: number;
  try {
    recentFailures = await recentFailureCount(ip);
  } catch (error) {
    logError('throttle check failed', error);
    return { error: UNAVAILABLE };
  }
  if (isThrottled(recentFailures)) {
    return { error: 'Too many attempts. Try again later.' };
  }

  const password = formData.get('password');
  if (typeof password !== 'string' || !passwordMatches(password, config.password)) {
    try {
      await recordFailure(ip);
    } catch (error) {
      logError('recording failed login failed', error);
    }
    return { error: 'Incorrect password.' };
  }

  try {
    await clearFailures(ip);
  } catch (error) {
    logError('clearing login attempts failed', error);
  }

  await startAdminSession();
  redirect('/admin'); // outside try/catch: redirect() works by throwing
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect('/admin/login');
}
