'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/admin/client';
import type { ActionResult } from '@/lib/admin/types';
import { isTargetType, isUuid, type TargetType } from '@/lib/admin/validate';

// Every action starts with getAdminClient(), which verifies the admin session (and
// redirects when there is none) BEFORE any input is inspected. Arguments come from the
// browser, so they are re-validated here regardless of what the UI allows.

const FAILED = "That didn't work. Check the server logs and try again.";
const INVALID = 'Invalid request.';
const REASON_MAX = 200;

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

// Detail goes to the server log only; the browser gets a generic message.
function failed(context: string, error: unknown): ActionResult {
  console.error(`[admin] ${context}: ${describe(error)}`);
  return { ok: false, error: FAILED };
}

function succeeded(): ActionResult {
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function dismissReports(type: TargetType, id: string): Promise<ActionResult> {
  const db = await getAdminClient();
  if (!isTargetType(type) || !isUuid(id)) return { ok: false, error: INVALID };

  const { error } = await db.rpc('admin_dismiss_reports', {
    p_target_type: type,
    p_target_id: id,
  });
  if (error) return failed('dismiss reports', error);
  return succeeded();
}

// Hide is reversible: the row stays in the database, invisible to the public.
export async function setHidden(
  type: TargetType,
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  const db = await getAdminClient();
  if (!isTargetType(type) || !isUuid(id) || typeof hidden !== 'boolean') {
    return { ok: false, error: INVALID };
  }

  const { error } = await db
    .from(type === 'post' ? 'posts' : 'advices')
    .update({ hidden })
    .eq('id', id);
  if (error) return failed('set hidden', error);
  return succeeded();
}

// Permanent. Removes the item, its replies/votes (for a post) and its report rows.
export async function deleteContent(type: TargetType, id: string): Promise<ActionResult> {
  const db = await getAdminClient();
  if (!isTargetType(type) || !isUuid(id)) return { ok: false, error: INVALID };

  const { error } = await db.rpc('admin_delete_content', {
    p_target_type: type,
    p_target_id: id,
  });
  if (error) return failed('delete content', error);
  return succeeded();
}

export async function banAuthor(
  anonUserId: string,
  hideContent: boolean,
  reason: string,
): Promise<ActionResult> {
  const db = await getAdminClient();
  if (!isUuid(anonUserId) || typeof hideContent !== 'boolean') {
    return { ok: false, error: INVALID };
  }

  const { error } = await db.rpc('admin_ban_author', {
    p_anon_user_id: anonUserId,
    p_reason: typeof reason === 'string' ? reason.trim().slice(0, REASON_MAX) : '',
    p_hide_content: hideContent,
  });
  if (error) return failed('ban author', error);
  return succeeded();
}
