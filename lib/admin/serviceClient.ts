import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AdminConfigError } from './session';

// UNCHECKED service-role client: it does not verify an admin session and it bypasses RLS.
// Only client.ts (which verifies first) and loginAttempts.ts (which must run before anyone
// is logged in) may import this module. Everything else goes through getAdminClient().
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new AdminConfigError('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new AdminConfigError('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
