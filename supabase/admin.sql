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

-- Only the announcement's keys are public (text, title, colour theme, on/off switch); any other
-- setting stays private by default.
drop policy if exists "anon select announcement" on settings;
create policy "anon select announcement" on settings
  for select to anon
  using (key in ('announcement', 'announcement_title', 'announcement_theme', 'announcement_active'));

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

-- 7. Redesign additions ------------------------------------------------------------------------
-- Data for the redesigned screens. Everything here is read-only except the policy widening.

-- Visible posts per category over the last p_days, most active first. SECURITY INVOKER, so RLS
-- applies: hidden posts are never counted. Public (feed side card).
create or replace function popular_categories(p_days int default 7)
returns table (category text, n bigint)
language sql
stable
set search_path = public
as $$
  select p.category, count(*)::bigint as n
  from posts p
  where p.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 7), 1))
  group by p.category
  order by n desc, p.category
  limit 6;
$$;

revoke all on function popular_categories(int) from public;
grant execute on function popular_categories(int) to anon, authenticated, service_role;

-- Open reports (reported, not hidden), posts and advice together, most-reported first. p_q is a
-- LIKE pattern body already escaped by the caller; it matches the text or the author's name.
create or replace function admin_reports_list(
  p_type text default null,
  p_q text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  item_type text,
  id uuid,
  post_id uuid,
  body text,
  category text,
  author_id uuid,
  author_name text,
  report_count int,
  latest_report_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with items as (
    select 'post'::text as item_type, p.id, p.id as post_id, p.body, p.category,
           p.anon_user_id as author_id, u.anon_name as author_name, p.report_count, p.created_at,
           (select max(r.created_at) from reports r
             where r.target_type = 'post' and r.target_id = p.id) as latest_report_at
    from posts p
    join anon_users u on u.id = p.anon_user_id
    where p.report_count > 0 and not p.hidden
    union all
    select 'advice', a.id, a.post_id, a.body, null::text,
           a.anon_user_id, u.anon_name, a.report_count, a.created_at,
           (select max(r.created_at) from reports r
             where r.target_type = 'advice' and r.target_id = a.id)
    from advices a
    join anon_users u on u.id = a.anon_user_id
    where a.report_count > 0 and not a.hidden
  ),
  filtered as (
    select * from items i
    where (p_type is null or i.item_type = p_type)
      and (coalesce(p_q, '') = ''
           or i.body ilike '%' || p_q || '%'
           or i.author_name ilike '%' || p_q || '%')
  )
  select f.item_type, f.id, f.post_id, f.body, f.category, f.author_id, f.author_name,
         f.report_count, f.latest_report_at, f.created_at,
         count(*) over () as total_count
  from filtered f
  order by f.report_count desc, f.latest_report_at desc nulls last, f.created_at desc, f.id
  limit greatest(least(coalesce(p_limit, 25), 100), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Every post and advice in one list. p_kind: all | posts | advices. p_status: all | visible |
-- hidden | flagged (reported and not hidden). A category filter applies to posts only, so it also
-- leaves replies out. p_q matches the text or the author's name (escaped by the caller).
create or replace function admin_content_list(
  p_kind text default 'all',
  p_q text default null,
  p_category text default null,
  p_status text default 'all',
  p_reported boolean default false,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  item_type text,
  id uuid,
  post_id uuid,
  body text,
  category text,
  author_id uuid,
  author_name text,
  report_count int,
  hidden boolean,
  pinned_at timestamptz,
  upvotes int,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with items as (
    select 'post'::text as item_type, p.id, p.id as post_id, p.body, p.category,
           p.anon_user_id as author_id, u.anon_name as author_name, p.report_count, p.hidden,
           p.pinned_at, null::int as upvotes, p.created_at
    from posts p
    join anon_users u on u.id = p.anon_user_id
    union all
    select 'advice', a.id, a.post_id, a.body, null::text,
           a.anon_user_id, u.anon_name, a.report_count, a.hidden,
           null::timestamptz, a.upvotes, a.created_at
    from advices a
    join anon_users u on u.id = a.anon_user_id
  ),
  filtered as (
    select * from items i
    where (coalesce(p_kind, 'all') = 'all'
           or (p_kind = 'posts' and i.item_type = 'post')
           or (p_kind = 'advices' and i.item_type = 'advice'))
      and (coalesce(p_q, '') = ''
           or i.body ilike '%' || p_q || '%'
           or i.author_name ilike '%' || p_q || '%')
      and (coalesce(p_category, '') in ('', 'all')
           or (i.item_type = 'post' and i.category = p_category))
      and (coalesce(p_status, 'all') = 'all'
           or (p_status = 'visible' and not i.hidden)
           or (p_status = 'hidden' and i.hidden)
           or (p_status = 'flagged' and i.report_count > 0 and not i.hidden))
      and (not coalesce(p_reported, false) or i.report_count > 0)
  )
  select f.item_type, f.id, f.post_id, f.body, f.category, f.author_id, f.author_name,
         f.report_count, f.hidden, f.pinned_at, f.upvotes, f.created_at,
         count(*) over () as total_count
  from filtered f
  order by f.created_at desc, f.id
  limit greatest(least(coalesce(p_limit, 25), 100), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Everything the dashboard, reports, content and settings cards need, in one round trip.
-- "week" pairs are [last 7 days, the 7 days before]; "daily" is the last 7 UTC days.
create or replace function admin_dashboard()
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_totals jsonb;
  v_week jsonb;
  v_daily jsonb;
begin
  select jsonb_build_object(
    'posts', (select count(*) from posts),
    'advices', (select count(*) from advices),
    'anon_users', (select count(*) from anon_users),
    'open_reports',
      (select count(*) from posts where report_count > 0 and not hidden)
      + (select count(*) from advices where report_count > 0 and not hidden),
    'urgent_reports',
      (select count(*) from posts where report_count >= 3 and not hidden)
      + (select count(*) from advices where report_count >= 3 and not hidden),
    'hidden_items',
      (select count(*) from posts where hidden) + (select count(*) from advices where hidden),
    'banned_devices', (select count(*) from banned_devices),
    'new_content_24h',
      (select count(*) from posts where created_at >= now() - interval '24 hours')
      + (select count(*) from advices where created_at >= now() - interval '24 hours'),
    'new_reports_24h', (select count(*) from reports where created_at >= now() - interval '24 hours'),
    'failed_signins_24h',
      (select count(*) from admin_login_attempts where attempted_at >= now() - interval '24 hours')
  ) into v_totals;

  select jsonb_build_object(
    'posts', jsonb_build_array(
      (select count(*) from posts where created_at >= now() - interval '7 days'),
      (select count(*) from posts
         where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')),
    'advices', jsonb_build_array(
      (select count(*) from advices where created_at >= now() - interval '7 days'),
      (select count(*) from advices
         where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')),
    'anon_users', jsonb_build_array(
      (select count(*) from anon_users where created_at >= now() - interval '7 days'),
      (select count(*) from anon_users
         where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days')),
    'reports', jsonb_build_array(
      (select count(*) from reports where created_at >= now() - interval '7 days'),
      (select count(*) from reports
         where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'))
  ) into v_week;

  select coalesce(jsonb_agg(jsonb_build_object(
    'day', to_char(g.d, 'YYYY-MM-DD'),
    'content',
      (select count(*) from posts p
         where p.created_at >= g.d and p.created_at < g.d + interval '1 day')
      + (select count(*) from advices a
           where a.created_at >= g.d and a.created_at < g.d + interval '1 day'),
    'users', (select count(*) from anon_users u
                where u.created_at >= g.d and u.created_at < g.d + interval '1 day'),
    'reports', (select count(*) from reports r
                  where r.created_at >= g.d and r.created_at < g.d + interval '1 day')
  ) order by g.d), '[]'::jsonb)
  into v_daily
  from generate_series(
    date_trunc('day', now()) - interval '6 days',
    date_trunc('day', now()),
    interval '1 day'
  ) as g(d);

  return jsonb_build_object('totals', v_totals, 'week', v_week, 'daily', v_daily);
end;
$$;

revoke all on function admin_reports_list(text, text, int, int) from public, anon, authenticated;
revoke all on function admin_content_list(text, text, text, text, boolean, int, int) from public, anon, authenticated;
revoke all on function admin_dashboard() from public, anon, authenticated;

grant execute on function admin_reports_list(text, text, int, int) to service_role;
grant execute on function admin_content_list(text, text, text, text, boolean, int, int) to service_role;
grant execute on function admin_dashboard() to service_role;

-- Ask PostgREST to pick up the new tables/functions immediately.
notify pgrst, 'reload schema';

commit;
