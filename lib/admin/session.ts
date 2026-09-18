// Pure session and config logic for the admin area. Deliberately free of `server-only`
// and next/headers so it can be unit-tested under plain Node and reused by proxy.ts.
import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

const MIN_PASSWORD_LENGTH = 16;
const MIN_SECRET_LENGTH = 32;

// Messages name the offending variable but never its value.
export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminConfigError';
  }
}

export interface AdminConfig {
  password: string;
  sessionSecret: string;
}

export function loadAdminConfig(env: Record<string, string | undefined>): AdminConfig {
  const password = env.ADMIN_PASSWORD;
  const sessionSecret = env.ADMIN_SESSION_SECRET;

  if (!password) throw new AdminConfigError('ADMIN_PASSWORD is not set');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AdminConfigError(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!sessionSecret) throw new AdminConfigError('ADMIN_SESSION_SECRET is not set');
  if (sessionSecret.length < MIN_SECRET_LENGTH) {
    throw new AdminConfigError(
      `ADMIN_SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return { password, sessionSecret };
}

// Hashing both sides first gives timingSafeEqual equal-length inputs, so neither the
// comparison time nor an early length check reveals anything about the real password.
export function passwordMatches(input: string, expected: string): boolean {
  if (!expected) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function keyFor(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(secret: string, nowMs: number = Date.now()): Promise<string> {
  const issuedAt = Math.floor(nowMs / 1000);
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(keyFor(secret));
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, keyFor(secret), {
      algorithms: ['HS256'],
      currentDate: new Date(nowMs),
    });
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
