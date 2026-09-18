import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyAdmin } from './auth';
import { createServiceClient } from './serviceClient';

// The only way admin code gets a service-role client. It verifies the session first, so
// touching the database without an auth check is not something a caller can forget.
export async function getAdminClient(): Promise<SupabaseClient> {
  await verifyAdmin();
  return createServiceClient();
}
