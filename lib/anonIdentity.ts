import { supabase } from './supabaseClient';
import type { AnonUser } from './types';

import { IDENTITY_EVENT, IDENTITY_KEY } from './identityStore';

const STORAGE_KEY = IDENTITY_KEY;

function randomDeviceToken(): string {
  return crypto.randomUUID();
}

function randomAnonName(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Anon #${n}`;
}

export async function getOrCreateAnonIdentity(): Promise<AnonUser> {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    return JSON.parse(cached) as AnonUser;
  }

  const device_token = randomDeviceToken();
  const anon_name = randomAnonName();

  const { data, error } = await supabase
    .from('anon_users')
    .insert({ device_token, anon_name })
    .select('id, anon_name, device_token')
    .single();

  if (error || !data) {
    throw new Error(`Could not create anonymous identity: ${error?.message}`);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(IDENTITY_EVENT)); // let the sidebar chip pick it up
  return data as AnonUser;
}
