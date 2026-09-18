-- Seed data for GistVeil V1 — run once in the Supabase SQL Editor after
-- schema.sql, to avoid an empty-feed cold start when first sharing the link.

insert into anon_users (id, anon_name, device_token) values
  ('00000000-0000-0000-0000-000000000001', 'Anon #1247', 'seed-token-1'),
  ('00000000-0000-0000-0000-000000000002', 'Anon #893', 'seed-token-2'),
  ('00000000-0000-0000-0000-000000000003', 'Anon #310', 'seed-token-3');

insert into posts (anon_user_id, category, body) values
  ('00000000-0000-0000-0000-000000000001', 'work', 'I feel stuck in my job and don''t know if I should quit. Any advice?'),
  ('00000000-0000-0000-0000-000000000002', 'family', 'How do I set boundaries with family without conflict?'),
  ('00000000-0000-0000-0000-000000000003', 'relationship', 'My partner and I keep having the same argument. How do you actually break the cycle?'),
  ('00000000-0000-0000-0000-000000000001', 'money', 'I''m 25 and have zero savings. Where do I even start?'),
  ('00000000-0000-0000-0000-000000000002', 'mental_health', 'Some days I just don''t want to get out of bed. Is this normal or should I see someone?'),
  ('00000000-0000-0000-0000-000000000003', 'education', 'Failed a core course this semester. How do I tell my parents?'),
  ('00000000-0000-0000-0000-000000000001', 'relationship', 'Is it normal to still think about an ex two years later?'),
  ('00000000-0000-0000-0000-000000000002', 'work', 'My manager takes credit for my ideas in meetings. How do I handle this without burning bridges?'),
  ('00000000-0000-0000-0000-000000000003', 'family', 'My parents want me to take over the family business but I have other plans. How do I bring this up?'),
  ('00000000-0000-0000-0000-000000000001', 'money', 'Friend owes me a significant amount and keeps avoiding the topic. What would you do?');
