import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import {
  AdminConfigError,
  SESSION_TTL_SECONDS,
  loadAdminConfig,
  passwordMatches,
  signSession,
  verifySessionToken,
} from './session';

const PASSWORD = 'p'.repeat(16);
const SECRET = 's'.repeat(32);
const NOW = Date.UTC(2026, 8, 18, 12, 0, 0);

describe('loadAdminConfig', () => {
  test('returns both values when valid', () => {
    const config = loadAdminConfig({ ADMIN_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: SECRET });
    assert.deepEqual(config, { password: PASSWORD, sessionSecret: SECRET });
  });

  test('accepts the exact minimum lengths (16 and 32)', () => {
    assert.doesNotThrow(() =>
      loadAdminConfig({ ADMIN_PASSWORD: 'a'.repeat(16), ADMIN_SESSION_SECRET: 'b'.repeat(32) }),
    );
  });

  test('throws when the password is missing', () => {
    assert.throws(
      () => loadAdminConfig({ ADMIN_SESSION_SECRET: SECRET }),
      (err: unknown) => err instanceof AdminConfigError && err.message.includes('ADMIN_PASSWORD'),
    );
  });

  test('throws when the password is too short, without leaking its value', () => {
    const short = 'short-value-xyz'; // 15 characters
    assert.equal(short.length, 15);
    assert.throws(
      () => loadAdminConfig({ ADMIN_PASSWORD: short, ADMIN_SESSION_SECRET: SECRET }),
      (err: unknown) =>
        err instanceof AdminConfigError &&
        err.message.includes('ADMIN_PASSWORD') &&
        !err.message.includes(short),
    );
  });

  test('throws when the session secret is missing', () => {
    assert.throws(
      () => loadAdminConfig({ ADMIN_PASSWORD: PASSWORD }),
      (err: unknown) => err instanceof AdminConfigError && err.message.includes('ADMIN_SESSION_SECRET'),
    );
  });

  test('throws when the session secret is too short (31), without leaking its value', () => {
    const short = 'x'.repeat(31);
    assert.throws(
      () => loadAdminConfig({ ADMIN_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: short }),
      (err: unknown) =>
        err instanceof AdminConfigError &&
        err.message.includes('ADMIN_SESSION_SECRET') &&
        !err.message.includes(short),
    );
  });
});

describe('passwordMatches', () => {
  test('true for an identical password', () => {
    assert.equal(passwordMatches(PASSWORD, PASSWORD), true);
  });

  test('false for a different password of the same length', () => {
    assert.equal(passwordMatches('q'.repeat(16), PASSWORD), false);
  });

  test('false for a different length (prefix and extension)', () => {
    assert.equal(passwordMatches(PASSWORD.slice(0, 8), PASSWORD), false);
    assert.equal(passwordMatches(`${PASSWORD}x`, PASSWORD), false);
  });

  test('false for empty input, and never matches an empty expected value', () => {
    assert.equal(passwordMatches('', PASSWORD), false);
    assert.equal(passwordMatches('', ''), false);
  });
});

describe('signSession / verifySessionToken', () => {
  test('round trip verifies', async () => {
    const token = await signSession(SECRET, NOW);
    assert.equal(await verifySessionToken(token, SECRET, NOW), true);
  });

  test('valid one second before expiry, expired one second after', async () => {
    const token = await signSession(SECRET, NOW);
    assert.equal(await verifySessionToken(token, SECRET, NOW + (SESSION_TTL_SECONDS - 1) * 1000), true);
    assert.equal(await verifySessionToken(token, SECRET, NOW + (SESSION_TTL_SECONDS + 1) * 1000), false);
  });

  test('a tampered payload is rejected', async () => {
    const [header, payload, signature] = (await signSession(SECRET, NOW)).split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), extra: 1 }),
    ).toString('base64url');
    assert.equal(await verifySessionToken(`${header}.${forged}.${signature}`, SECRET, NOW), false);
  });

  test('a tampered signature is rejected', async () => {
    const [header, payload, signature] = (await signSession(SECRET, NOW)).split('.');
    // Flip the FIRST signature character: it carries 6 data bits, whereas the last base64url
    // character of a 32-byte signature carries padding bits and could decode identically.
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
    assert.equal(await verifySessionToken(`${header}.${payload}.${flipped}`, SECRET, NOW), false);
  });

  test('a token signed with a different secret is rejected', async () => {
    const token = await signSession('z'.repeat(32), NOW);
    assert.equal(await verifySessionToken(token, SECRET, NOW), false);
  });

  test('undefined and empty tokens are rejected', async () => {
    assert.equal(await verifySessionToken(undefined, SECRET, NOW), false);
    assert.equal(await verifySessionToken('', SECRET, NOW), false);
    assert.equal(await verifySessionToken('not-a-jwt', SECRET, NOW), false);
  });

  test('an unsigned alg:none token claiming to be admin is rejected', async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const exp = Math.floor(NOW / 1000) + 3600;
    const unsigned = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ role: 'admin', exp })}.`;
    assert.equal(await verifySessionToken(unsigned, SECRET, NOW), false);
  });

  test('a validly signed token without the admin role is rejected', async () => {
    const iat = Math.floor(NOW / 1000);
    const token = await new SignJWT({ role: 'user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(new TextEncoder().encode(SECRET));
    assert.equal(await verifySessionToken(token, SECRET, NOW), false);
  });
});
