-- GistVeil admin schema additions.
--
-- Run in the Supabase SQL Editor AFTER schema.sql (and seed.sql, if you use it).
-- Safe to re-run. Run it BEFORE deploying code that uses the new columns/tables,
-- otherwise the public feed's pinned-post ordering has nothing to sort by.
--
-- What this does:
--   1. Adds hide/pin columns to posts and advices.
--   2. Adds banned_devices, blocked_words, settings, admin_login_attempts.
--   3. Makes hidden rows invisible to the public (anon) role.
--   4. Blocks banned devices from posting or replying (enforced by RLS).
--   5. Restricts anon INSERT to the intended columns. Before this, the insert
--      policies were `with check (true)` with table-wide INSERT, so a client could
--      insert rows with any report_count / upvotes (and, now, pinned_at / hidden).
--   6. Adds admin-only functions, executable by service_role only.

begin;

-- 1. New columns -------------------------------------------------------------

alter table posts   add column if not exists hidden boolean not null default false;
alter table posts   add column if not exists pinned_at timestamptz;
alter table advices add column if not exists hidden boolean not null default false;

-- 2. New tables --------------------------------------------------------------

create table if not exists banned_devices (
  device_token text primary key,
  reason text,
  banned_at timestamptz not null default now()
);

create table if not exists blocked_words (
  word text primary key
    check (word = lower(btrim(word)) and char_length(word) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists admin_login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_idx
  on admin_login_attempts (ip, attempted_at);

alter table banned_devices enable row level security;
alter table blocked_words enable row level security;
alter table settings enable row level security;
alter table admin_login_attempts enable row level security;

-- banned_devices and admin_login_attempts are service-role only: no policies, and no
-- table privileges for the public roles either (defence in depth).
revoke all on banned_devices from anon, authenticated;
revoke all on admin_login_attempts from anon, authenticated;

-- blocked_words and settings are read-only to the public roles.
revoke insert, update, delete, truncate, references, trigger
  on blocked_words from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on settings from anon, authenticated;
grant select on blocked_words, settings to anon;

drop policy if exists "anon select blocked_words" on blocked_words;
create policy "anon select blocked_words" on blocked_words
  for select to anon using (true);

-- Only the announcement key is public; any future setting stays private by default.
drop policy if exists "anon select announcement" on settings;
create policy "anon select announcement" on settings
  for select to anon using (key = 'announcement');

-- 3. Hidden content is invisible to the public --------------------------------

drop policy if exists "anon select posts" on posts;
create policy "anon select posts" on posts
  for select to anon using (not hidden);

-- Advice is public only if it is not hidden AND its post is visible. The subquery on
-- posts runs under the caller's RLS, so it only finds posts anon may see: hiding a post
-- therefore hides its whole thread, not just the post row.
drop policy if exists "anon select advices" on advices;
create policy "anon select advices" on advices
  for select to anon
  using (
    not hidden
    and exists (select 1 from posts p where p.id = advices.post_id)
  );

-- 4. Banned devices cannot post or reply --------------------------------------

-- SECURITY DEFINER so the public role can be checked against banned_devices without
-- being able to read it. search_path is pinned so the function can't be hijacked.
create or replace function is_banned(p_anon_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from anon_users u
    join banned_devices b on b.device_token = u.device_token
    where u.id = p_anon_user_id
  );
$$;

revoke all on function is_banned(uuid) from public;
grant execute on function is_banned(uuid) to anon;

drop policy if exists "anon insert posts" on posts;
create policy "anon insert posts" on posts
  for insert to anon with check (not is_banned(anon_user_id));

drop policy if exists "anon insert advices" on advices;
create policy "anon insert advices" on advices
  for insert to anon with check (not is_banned(anon_user_id));

-- 5. Column-level INSERT: anon may only set the columns the app actually sends ----
-- (REVOKE on the table also clears any column grants, so this is re-runnable.)

revoke insert on posts from anon;
grant insert (anon_user_id, category, body) on posts to anon;

revoke insert on advices from anon;
grant insert (post_id, anon_user_id, body) on advices to anon;

-- 6. Admin-only functions ------------------------------------------------------
-- Called through the service-role client. Multi-statement work lives here so it is
-- atomic. EXECUTE is revoked from public/anon/authenticated at the end: Postgres and
-- Supabase grant it to those roles by default, so the revoke is required.

create or replace function admin_dismiss_reports(p_target_type text, p_target_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_target_type = 'post' then
    delete from reports where target_type = 'post' and target_id = p_target_id;
    update posts set report_count = 0 where id = p_target_id;
  elsif p_target_type = 'advice' then
    delete from reports where target_type = 'advice' and target_id = p_target_id;
    update advices set report_count = 0 where id = p_target_id;
  else
    raise exception 'invalid target type: %', p_target_type;
  end if;
end;
$$;

-- reports has no foreign key, so its rows are removed explicitly; deleting a post
-- cascades to its advices and their votes.
create or replace function admin_delete_content(p_target_type text, p_target_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_target_type = 'post' then
    delete from reports
      where target_type = 'advice'
        and target_id in (select id from advices where post_id = p_target_id);
    delete from reports where target_type = 'post' and target_id = p_target_id;
    delete from posts where id = p_target_id;
  elsif p_target_type = 'advice' then
    delete from reports where target_type = 'advice' and target_id = p_target_id;
    delete from advices where id = p_target_id;
  else
    raise exception 'invalid target type: %', p_target_type;
  end if;
end;
$$;

create or replace function admin_ban_author(
  p_anon_user_id uuid,
  p_reason text,
  p_hide_content boolean
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_token text;
begin
  select device_token into v_token from anon_users where id = p_anon_user_id;
  if v_token is null then
    raise exception 'unknown author';
  end if;

  insert into banned_devices (device_token, reason)
  values (v_token, nullif(btrim(p_reason), ''))
  on conflict (device_token) do nothing;

  if p_hide_content then
    update posts set hidden = true where anon_user_id = p_anon_user_id;
    update advices set hidden = true where anon_user_id = p_anon_user_id;
  end if;
end;
$$;

create or replace function admin_bans()
returns table (
  device_token text,
  reason text,
  banned_at timestamptz,
  anon_user_id uuid,
  anon_name text,
  post_count bigint,
  advice_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    b.device_token,
    b.reason,
    b.banned_at,
    u.id,
    u.anon_name,
    (select count(*) from posts p where p.anon_user_id = u.id),
    (select count(*) from advices a where a.anon_user_id = u.id)
  from banned_devices b
  left join anon_users u on u.device_token = b.device_token
  order by b.banned_at desc;
$$;

-- One JSON document for the dashboard. Done in SQL because the Supabase API caps
-- responses at 1000 rows, which would make counting in JS silently undercount.
-- Totals, category counts and the daily series include hidden items (they describe
-- what users did). "Open report" means report_count > 0 and not hidden.
create or replace function admin_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_totals jsonb;
  v_categories jsonb;
  v_daily jsonb;
begin
  select jsonb_build_object(
    'posts', (select count(*) from posts),
    'advices', (select count(*) from advices),
    'anon_users', (select count(*) from anon_users),
    'hidden_posts', (select count(*) from posts where hidden),
    'hidden_advices', (select count(*) from advices where hidden),
    'banned_devices', (select count(*) from banned_devices),
    'open_reports',
      (select count(*) from posts where report_count > 0 and not hidden)
      + (select count(*) from advices where report_count > 0 and not hidden)
  ) into v_totals;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('category', c.category, 'count', c.n)
      order by c.n desc, c.category
    ),
    '[]'::jsonb
  ) into v_categories
  from (select category, count(*) as n from posts group by category) c;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', to_char(g.d, 'YYYY-MM-DD'),
        'posts', (select count(*) from posts p
                  where p.created_at >= g.d and p.created_at < g.d + interval '1 day'),
        'advices', (select count(*) from advices a
                    where a.created_at >= g.d and a.created_at < g.d + interval '1 day'),
        'new_users', (select count(*) from anon_users u
                      where u.created_at >= g.d and u.created_at < g.d + interval '1 day')
      )
      order by g.d
    ),
    '[]'::jsonb
  ) into v_daily
  from generate_series(
    date_trunc('day', now()) - ((v_days - 1) * interval '1 day'),
    date_trunc('day', now()),
    interval '1 day'
  ) as g(d);

  return jsonb_build_object('totals', v_totals, 'by_category', v_categories, 'daily', v_daily);
end;
$$;

revoke all on function admin_dismiss_reports(text, uuid) from public, anon, authenticated;
revoke all on function admin_delete_content(text, uuid) from public, anon, authenticated;
revoke all on function admin_ban_author(uuid, text, boolean) from public, anon, authenticated;
revoke all on function admin_bans() from public, anon, authenticated;
revoke all on function admin_stats(int) from public, anon, authenticated;

grant execute on function admin_dismiss_reports(text, uuid) to service_role;
grant execute on function admin_delete_content(text, uuid) to service_role;
grant execute on function admin_ban_author(uuid, text, boolean) to service_role;
grant execute on function admin_bans() to service_role;
grant execute on function admin_stats(int) to service_role;

-- Ask PostgREST to pick up the new tables/functions immediately.
notify pgrst, 'reload schema';

commit;
