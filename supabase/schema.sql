-- GistVeil V1 schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)

create table anon_users (
  id uuid primary key default gen_random_uuid(),
  anon_name text not null,
  device_token text not null unique,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  anon_user_id uuid not null references anon_users(id),
  category text not null check (category in ('relationship','money','family','work','mental_health','education')),
  body text not null,
  report_count int not null default 0,
  created_at timestamptz not null default now()
);

create table advices (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  anon_user_id uuid not null references anon_users(id),
  body text not null,
  upvotes int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now()
);

create table advice_votes (
  advice_id uuid not null references advices(id) on delete cascade,
  device_token text not null,
  created_at timestamptz not null default now(),
  primary key (advice_id, device_token)
);

create table reports (
  target_type text not null check (target_type in ('post', 'advice')),
  target_id uuid not null,
  device_token text not null,
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, device_token)
);

-- Row Level Security: anon (public) role may insert/select posts, advices,
-- anon_users directly. advice_votes and reports have RLS enabled with NO
-- policies for anon, so they are only reachable through the SECURITY
-- DEFINER RPC functions below (owned by the table owner, which bypasses
-- RLS by default).

alter table anon_users enable row level security;
alter table posts enable row level security;
alter table advices enable row level security;
alter table advice_votes enable row level security;
alter table reports enable row level security;

create policy "anon insert anon_users" on anon_users for insert to anon with check (true);
create policy "anon select anon_users" on anon_users for select to anon using (true);

create policy "anon insert posts" on posts for insert to anon with check (true);
create policy "anon select posts" on posts for select to anon using (true);

create policy "anon insert advices" on advices for insert to anon with check (true);
create policy "anon select advices" on advices for select to anon using (true);

-- RPC functions: the only way to write to advice_votes / reports / bump counters.

create or replace function increment_upvote(p_advice_id uuid, p_device_token text)
returns void
language plpgsql
security definer
as $$
begin
  insert into advice_votes (advice_id, device_token) values (p_advice_id, p_device_token);
  update advices set upvotes = upvotes + 1 where id = p_advice_id;
end;
$$;

create or replace function increment_report(p_target_type text, p_target_id uuid, p_device_token text)
returns void
language plpgsql
security definer
as $$
begin
  insert into reports (target_type, target_id, device_token) values (p_target_type, p_target_id, p_device_token);
  if p_target_type = 'post' then
    update posts set report_count = report_count + 1 where id = p_target_id;
  elsif p_target_type = 'advice' then
    update advices set report_count = report_count + 1 where id = p_target_id;
  end if;
end;
$$;

grant execute on function increment_upvote(uuid, text) to anon;
grant execute on function increment_report(text, uuid, text) to anon;
