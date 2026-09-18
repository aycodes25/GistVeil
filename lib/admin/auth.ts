import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  AdminConfigError,
  SESSION_TTL_SECONDS,
  loadAdminConfig,
  signSession,
  verifySessionToken,
} from './session';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/admin',
  };
}

// True only for a validly signed, unexpired admin session cookie. Any failure, including a
// missing or weak ADMIN_* env var, means "not signed in": the admin fails closed.
export async function hasAdminSession(): Promise<boolean> {
  try {
    const { sessionSecret } = loadAdminConfig(process.env);
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    return await verifySessionToken(token, sessionSecret);
  } catch (error) {
    // Name the variable, never its value.
    if (error instanceof AdminConfigError) console.error(`[admin] ${error.message}`);
    return false;
  }
}

// Call at the top of every admin page and Server Action. proxy.ts is only an optimistic
// pre-filter; this is the check that actually protects the data.
export async function verifyAdmin(): Promise<void> {
  if (!(await hasAdminSession())) redirect('/admin/login');
}

export async function startAdminSession(): Promise<void> {
  const { sessionSecret } = loadAdminConfig(process.env);
  const token = await signSession(sessionSecret);
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS });
}

// The cookie is scoped to Path=/admin, and cookies().delete(name) can't target a path, so
// expire it with an identical path instead.
export async function endAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}
