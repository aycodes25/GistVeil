import 'server-only';
import { createServiceClient } from './serviceClient';
import { pruneBeforeIso, windowStartIso } from './throttle';

// Database access for the login throttle. Every function throws on a database error, and
// the login action treats that as "fail closed" rather than letting a broken throttle open
// the door. The rules themselves (limit, window, IP parsing) live in throttle.ts.

const TABLE = 'admin_login_attempts';

export async function recentFailureCount(ip: string, nowMs: number = Date.now()): Promise<number> {
  const { count, error } = await createServiceClient()
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gt('attempted_at', windowStartIso(nowMs));

  if (error) throw new Error(`Reading login attempts failed: ${error.message}`);
  return count ?? 0;
}

export async function recordFailure(ip: string, nowMs: number = Date.now()): Promise<void> {
  const db = createServiceClient();

  const { error } = await db.from(TABLE).insert({ ip });
  if (error) throw new Error(`Recording a failed login failed: ${error.message}`);

  // Housekeeping only: a failure to prune must not affect the login outcome.
  await db.from(TABLE).delete().lt('attempted_at', pruneBeforeIso(nowMs));
}

export async function clearFailures(ip: string, nowMs: number = Date.now()): Promise<void> {
  const db = createServiceClient();

  const { error } = await db.from(TABLE).delete().eq('ip', ip);
  if (error) throw new Error(`Clearing login attempts failed: ${error.message}`);

  await db.from(TABLE).delete().lt('attempted_at', pruneBeforeIso(nowMs));
}
