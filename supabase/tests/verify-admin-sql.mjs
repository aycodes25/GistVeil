// Verifies supabase/admin.sql on a real Postgres engine (PGlite, in-process, no Docker)
// with Supabase-style roles: anon / authenticated / service_role and their default grants.
// It applies schema.sql -> seed.sql -> admin.sql (twice) and checks RLS, column privileges,
// bans, hiding, the admin functions and their EXECUTE grants.
//
// PGlite is not a project dependency. Run it with a one-off, unsaved install:
//   npm install --no-save @electric-sql/pglite
//   node supabase/tests/verify-admin-sql.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const read = (p) => readFileSync(`${REPO}/${p}`, 'utf8');
const db = new PGlite();

let passed = 0;
let failed = 0;
function record(ok, msg, detail) {
  if (ok) {
    passed++;
    console.log(`  ok   ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL ${msg}${detail ? `  -> ${detail}` : ''}`);
  }
}

async function q(sql, params) {
  return (await db.query(sql, params)).rows;
}
async function as(role, fn) {
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
async function expectOk(role, sql, msg, params) {
  try {
    const rows = await as(role, () => q(sql, params));
    record(true, msg);
    return rows;
  } catch (e) {
    record(false, msg, e.message);
    return null;
  }
}
async function expectError(role, sql, re, msg, params) {
  try {
    await as(role, () => q(sql, params));
    record(false, msg, 'expected an error but the statement succeeded');
  } catch (e) {
    record(re.test(e.message), msg, re.test(e.message) ? undefined : `wrong error: ${e.message}`);
  }
}
const one = async (sql, params) => (await q(sql, params))[0];
const count = async (sql, params) => Number((await one(sql, params)).n);
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

const U1 = '00000000-0000-0000-0000-000000000001';
const U2 = '00000000-0000-0000-0000-000000000002';
const U3 = '00000000-0000-0000-0000-000000000003';
const RANDOM = '11111111-1111-1111-1111-111111111111';

// --- bootstrap: Supabase roles and default privileges -------------------------------
console.log('\n[bootstrap]');
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
await db.exec(read('supabase/schema.sql'));
await db.exec(read('supabase/seed.sql'));
record((await count('select count(*) as n from posts')) === 10, 'schema.sql + seed.sql applied (10 posts)');

// --- admin.sql applies, twice ----------------------------------------------------------
console.log('\n[admin.sql]');
const adminSql = read('supabase/admin.sql');
try {
  await db.exec(adminSql);
  record(true, 'applies cleanly');
} catch (e) {
  record(false, 'applies cleanly', e.message);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(1);
}
try {
  await db.exec(adminSql);
  record(true, 'is re-runnable (second run succeeds)');
} catch (e) {
  record(false, 'is re-runnable (second run succeeds)', e.message);
}

// --- column-level INSERT -------------------------------------------------------------------
console.log('\n[anon column-level INSERT]');
await expectOk(
  'anon',
  `insert into posts (anon_user_id, category, body) values ('${U2}', 'money', 'ok post') returning id`,
  'anon can insert a post with anon_user_id, category, body (RETURNING passes the select policy)',
);
const forbiddenPostCols = {
  report_count: '99',
  pinned_at: 'now()',
  hidden: 'false',
  created_at: 'now()',
  id: 'gen_random_uuid()',
};
for (const [col, val] of Object.entries(forbiddenPostCols)) {
  await expectError(
    'anon',
    `insert into posts (anon_user_id, category, body, ${col}) values ('${U2}', 'money', 'x', ${val})`,
    /permission denied/,
    `anon cannot set posts.${col} on insert`,
  );
}
const [seedPost] = await q(`select id from posts limit 1`);
await expectOk(
  'anon',
  `insert into advices (post_id, anon_user_id, body) values ('${seedPost.id}', '${U3}', 'ok advice') returning id`,
  'anon can insert advice with post_id, anon_user_id, body',
);
for (const [col, val] of Object.entries({ upvotes: '1000', report_count: '50', hidden: 'true' })) {
  await expectError(
    'anon',
    `insert into advices (post_id, anon_user_id, body, ${col}) values ('${seedPost.id}', '${U3}', 'x', ${val})`,
    /permission denied/,
    `anon cannot set advices.${col} on insert`,
  );
}
await expectOk('anon', `select id, pinned_at, hidden from posts limit 1`, 'anon can still SELECT the new columns');

// --- hide ---------------------------------------------------------------------------------------
console.log('\n[hidden content]');
const hp = await one(`insert into posts (anon_user_id, category, body) values ($1,'work','to hide') returning id`, [U2]);
const ha = await one(`insert into advices (post_id, anon_user_id, body) values ($1,$2,'advice to hide') returning id`, [hp.id, U3]);
await q(`insert into advices (post_id, anon_user_id, body) values ($1,$2,'visible advice')`, [hp.id, U3]);
await q(`update posts set hidden = true where id = $1`, [hp.id]);
await q(`update advices set hidden = true where id = $1`, [ha.id]);
const anonPostCount = await as('anon', () => count(`select count(*) as n from posts where id = '${hp.id}'`));
const svcPostCount = await as('service_role', () => count(`select count(*) as n from posts where id = '${hp.id}'`));
record(anonPostCount === 0, 'hidden post is invisible to anon');
record(svcPostCount === 1, 'hidden post is still visible to service_role');
const anonAdvCount = await as('anon', () => count(`select count(*) as n from advices where post_id = '${hp.id}'`));
const svcAdvCount = await as('service_role', () => count(`select count(*) as n from advices where post_id = '${hp.id}'`));
record(anonAdvCount === 0, 'advice under a hidden post is invisible (post row gone; hidden advice excluded)');
record(svcAdvCount === 2, 'service_role sees both advices');
await q(`update posts set hidden = false where id = $1`, [hp.id]);
const anonAdvAfter = await as('anon', () => count(`select count(*) as n from advices where post_id = '${hp.id}'`));
record(anonAdvAfter === 1, 'after unhiding the post, only the non-hidden advice is visible');

// --- privileges on new tables ------------------------------------------------------------------
console.log('\n[table privileges]');
await expectError('anon', 'select * from banned_devices', /permission denied/, 'anon cannot read banned_devices');
await expectError('anon', 'select * from admin_login_attempts', /permission denied/, 'anon cannot read admin_login_attempts');
await expectError('anon', `insert into admin_login_attempts (ip) values ('1.1.1.1')`, /permission denied/, 'anon cannot write admin_login_attempts');
await expectError('anon', `insert into blocked_words (word) values ('x')`, /permission denied/, 'anon cannot insert blocked_words');
await expectError('anon', `insert into settings (key, value) values ('announcement','x')`, /permission denied/, 'anon cannot insert settings');
await expectError('anon', `update settings set value = 'x'`, /permission denied/, 'anon cannot update settings');
await q(`insert into settings (key, value) values ('announcement','hello'), ('private_thing','secret')`);
const keys = (await as('anon', () => q('select key from settings order by key'))).map((r) => r.key);
record(JSON.stringify(keys) === '["announcement"]', 'anon sees only the announcement setting', JSON.stringify(keys));
await expectOk('service_role', `insert into blocked_words (word) values ('badword')`, 'service_role can add a blocked word');
const words = (await as('anon', () => q('select word from blocked_words'))).map((r) => r.word);
record(words.includes('badword'), 'anon can read blocked_words');
await expectError('service_role', `insert into blocked_words (word) values ('Upper')`, /check constraint/, 'blocked_words rejects non-lowercase');
await expectError('service_role', `insert into blocked_words (word) values ('${'a'.repeat(61)}')`, /check constraint/, 'blocked_words rejects 61 characters');
await expectOk('service_role', `insert into admin_login_attempts (ip) values ('9.9.9.9')`, 'service_role can write admin_login_attempts (identity column needs no grant)');

// --- function privileges --------------------------------------------------------------------------------
console.log('\n[function privileges]');
const adminCalls = [
  `select admin_stats(30)`,
  `select admin_bans()`,
  `select admin_dismiss_reports('post', '${RANDOM}')`,
  `select admin_delete_content('post', '${RANDOM}')`,
  `select admin_ban_author('${U1}', 'x', false)`,
];
for (const role of ['anon', 'authenticated']) {
  for (const call of adminCalls) {
    await expectError(role, call, /permission denied for function/, `${role} cannot run ${call.slice(7, call.indexOf('('))}`);
  }
}
await expectOk('service_role', `select admin_stats(30)`, 'service_role can run admin_stats');
await expectOk('service_role', `select * from admin_bans()`, 'service_role can run admin_bans');
await expectOk('service_role', `select admin_dismiss_reports('post', '${RANDOM}')`, 'service_role can run admin_dismiss_reports');
await expectOk('service_role', `select admin_delete_content('post', '${RANDOM}')`, 'service_role can run admin_delete_content');
await expectOk('anon', `select is_banned('${U2}') as b`, 'anon can call is_banned (needed by the insert policies)');

// --- ban ---------------------------------------------------------------------------------------------------------
console.log('\n[ban]');
await expectOk('service_role', `select admin_ban_author('${U1}', '  spam  ', true)`, 'admin_ban_author(hide=true) runs');
await expectError(
  'anon',
  `insert into posts (anon_user_id, category, body) values ('${U1}', 'money', 'banned post')`,
  /row-level security/,
  'banned author cannot post (RLS)',
);
await expectError(
  'anon',
  `insert into advices (post_id, anon_user_id, body) values ('${seedPost.id}', '${U1}', 'banned advice')`,
  /row-level security/,
  'banned author cannot reply (RLS)',
);
await expectOk(
  'anon',
  `insert into posts (anon_user_id, category, body) values ('${U2}', 'money', 'unbanned author post') returning id`,
  'a different author can still post',
);
record(
  (await count(`select count(*) as n from posts where anon_user_id = '${U1}' and not hidden`)) === 0 &&
    (await count(`select count(*) as n from posts where anon_user_id = '${U1}' and hidden`)) > 0,
  "ban with hide=true hid all of the author's posts",
);
const banRow = await one(`select reason from banned_devices where device_token = 'seed-token-1'`);
record(banRow?.reason === 'spam', 'ban reason is trimmed and stored', JSON.stringify(banRow));
await expectOk('service_role', `select admin_ban_author('${U1}', 'again', false)`, 'banning an already-banned author is a no-op, not an error');
await expectError('service_role', `select admin_ban_author('${RANDOM}', 'x', false)`, /unknown author/, 'banning an unknown author errors');
await q(`delete from banned_devices where device_token = 'seed-token-1'`);
await expectOk(
  'anon',
  `insert into posts (anon_user_id, category, body) values ('${U1}', 'money', 'back again') returning id`,
  'after unban the author can post again',
);

// --- dismiss / delete ---------------------------------------------------------------------------------
console.log('\n[dismiss and delete]');
const P = await one(`insert into posts (anon_user_id, category, body) values ($1,'family','P') returning id`, [U2]);
const A1 = await one(`insert into advices (post_id, anon_user_id, body) values ($1,$2,'A1') returning id`, [P.id, U3]);
await as('anon', async () => {
  await q(`select increment_upvote('${A1.id}', 'dev-1')`);
  await q(`select increment_upvote('${A1.id}', 'dev-2')`);
  await q(`select increment_report('post', '${P.id}', 'dev-1')`);
  await q(`select increment_report('post', '${P.id}', 'dev-2')`);
  await q(`select increment_report('advice', '${A1.id}', 'dev-1')`);
});
record((await one(`select upvotes from advices where id = $1`, [A1.id])).upvotes === 2, 'increment_upvote still works for anon');
record((await one(`select report_count from posts where id = $1`, [P.id])).report_count === 2, 'increment_report still works for anon');
await expectError('anon', `select increment_upvote('${A1.id}', 'dev-1')`, /duplicate key/, 'one upvote per device is still enforced');

await q(`select admin_dismiss_reports('post', $1)`, [P.id]);
record((await one(`select report_count from posts where id = $1`, [P.id])).report_count === 0, 'dismiss zeroes the post report_count');
record((await count(`select count(*) as n from reports where target_type='post' and target_id = $1`, [P.id])) === 0, 'dismiss deletes the post report rows');
record((await count(`select count(*) as n from reports where target_type='advice' and target_id = $1`, [A1.id])) === 1, "dismiss leaves the advice's reports alone");
await as('anon', () => q(`select increment_report('post', '${P.id}', 'dev-1')`));
record(true, 'the same device can report again after a dismiss');

await q(`select admin_delete_content('post', $1)`, [P.id]);
record((await count(`select count(*) as n from posts where id = $1`, [P.id])) === 0, 'delete removes the post');
record((await count(`select count(*) as n from advices where post_id = $1`, [P.id])) === 0, 'delete cascades to advices');
record((await count(`select count(*) as n from advice_votes where advice_id = $1`, [A1.id])) === 0, 'delete cascades to advice_votes');
record(
  (await count(`select count(*) as n from reports where target_id in ($1, $2)`, [P.id, A1.id])) === 0,
  'delete leaves no orphaned reports rows (post and its advice)',
);

const Q = await one(`insert into posts (anon_user_id, category, body) values ($1,'work','Q') returning id`, [U2]);
const B = await one(`insert into advices (post_id, anon_user_id, body) values ($1,$2,'B') returning id`, [Q.id, U3]);
await as('anon', () => q(`select increment_report('advice', '${B.id}', 'dev-9')`));
await q(`select admin_delete_content('advice', $1)`, [B.id]);
record((await count(`select count(*) as n from advices where id = $1`, [B.id])) === 0, 'deleting an advice removes it');
record((await count(`select count(*) as n from posts where id = $1`, [Q.id])) === 1, 'deleting an advice keeps its post');
record((await count(`select count(*) as n from reports where target_id = $1`, [B.id])) === 0, "deleting an advice removes that advice's reports");
await expectError('service_role', `select admin_delete_content('user', '${RANDOM}')`, /invalid target type/, 'delete rejects an invalid target type');
await expectError('service_role', `select admin_dismiss_reports('user', '${RANDOM}')`, /invalid target type/, 'dismiss rejects an invalid target type');

// --- stats and bans listing ------------------------------------------------------------------------------------
console.log('\n[stats and bans listing]');
const stats = parse((await as('service_role', () => q('select admin_stats(30) as s')))[0].s);
const t = stats.totals;
record(t.posts === (await count('select count(*) as n from posts')), 'stats.totals.posts matches the table', String(t.posts));
record(t.advices === (await count('select count(*) as n from advices')), 'stats.totals.advices matches the table');
record(t.anon_users === (await count('select count(*) as n from anon_users')), 'stats.totals.anon_users matches the table');
record(t.hidden_posts === (await count('select count(*) as n from posts where hidden')), 'stats.totals.hidden_posts matches');
record(t.hidden_advices === (await count('select count(*) as n from advices where hidden')), 'stats.totals.hidden_advices matches');
record(
  t.open_reports ===
    (await count('select count(*) as n from posts where report_count > 0 and not hidden')) +
      (await count('select count(*) as n from advices where report_count > 0 and not hidden')),
  'stats.totals.open_reports counts only non-hidden reported items',
);
record(stats.daily.length === 30, 'daily series has 30 entries', String(stats.daily.length));
record(stats.daily.reduce((s, d) => s + d.posts, 0) === t.posts, 'daily post counts sum to the total (all rows are from today)');
const today = (await one(`select to_char(now(), 'YYYY-MM-DD') as d`)).d;
record(stats.daily.at(-1).day === today, 'the last daily entry is today', stats.daily.at(-1).day);
record(stats.by_category.reduce((s, c) => s + c.count, 0) === t.posts, 'category counts sum to the total posts');
const s0 = parse((await as('service_role', () => q('select admin_stats(0) as s')))[0].s);
const s1000 = parse((await as('service_role', () => q('select admin_stats(1000) as s')))[0].s);
const sNull = parse((await as('service_role', () => q('select admin_stats(null) as s')))[0].s);
record(s0.daily.length === 1, 'admin_stats(0) clamps to 1 day');
record(s1000.daily.length === 365, 'admin_stats(1000) clamps to 365 days');
record(sNull.daily.length === 30, 'admin_stats(null) falls back to 30 days');

await q(`select admin_ban_author('${U3}', 'test', false)`);
const bans = await as('service_role', () => q('select * from admin_bans()'));
const b3 = bans.find((r) => r.device_token === 'seed-token-3');
record(bans.length === 1 && b3?.anon_name === 'Anon #310', 'admin_bans lists the banned device with its anon name', JSON.stringify(bans));
record(
  Number(b3?.post_count) === (await count(`select count(*) as n from posts where anon_user_id = '${U3}'`)) &&
    Number(b3?.advice_count) === (await count(`select count(*) as n from advices where anon_user_id = '${U3}'`)),
  'admin_bans post/advice counts match the tables',
);

// --- redesign additions ---------------------------------------------------------------------
console.log('\n[redesign: banner settings policy, popular_categories, list functions, dashboard]');

// settings: exactly the four announcement keys are public
await q(`insert into settings (key, value) values
  ('announcement_title','Notice'),('announcement_theme','warning'),('announcement_active','true'),('secret_setting','x')
  on conflict (key) do update set value = excluded.value`);
const publicKeys = (await as('anon', () => q('select key from settings order by key'))).map((r) => r.key);
record(
  JSON.stringify(publicKeys) === JSON.stringify(['announcement', 'announcement_active', 'announcement_theme', 'announcement_title']),
  'anon reads exactly the four announcement keys and no other setting',
  JSON.stringify(publicKeys),
);

// grants
for (const call of [
  `select * from admin_reports_list()`,
  `select * from admin_content_list()`,
  `select admin_dashboard()`,
]) {
  for (const role of ['anon', 'authenticated']) {
    await expectError(role, call, /permission denied for function/, `${role} cannot run ${call.slice(7, call.indexOf('(', 7))}`);
  }
  await expectOk('service_role', call, `service_role can run ${call.slice(7, call.indexOf('(', 7))}`);
}
await expectOk('anon', `select * from popular_categories(7)`, 'anon can run popular_categories');

// popular_categories: visible posts in the window only, RLS applies (hidden posts never counted)
const RA = '00000000-0000-0000-0000-0000000000a1';
const RB = '00000000-0000-0000-0000-0000000000a2';
const RC = '00000000-0000-0000-0000-0000000000a3'; // owns the popular_categories fixtures so the RDX-scoped list checks below never see them
await q(`insert into anon_users (id, anon_name, device_token) values ($1,'Anon #RDXA','rdx-token-a'),($2,'Anon #RDXB','rdx-token-b'),($3,'Anon #PCXC','pcx-token-c')`, [RA, RB, RC]);
await q(`insert into posts (anon_user_id, category, body, created_at) values ($1,'education','PCX-too-old', now() - interval '10 days')`, [RC]);
await q(`insert into posts (anon_user_id, category, body, hidden) values ($1,'family','PCX-hidden-family', true)`, [RC]);
const expectedPopular = (await q(`select category, count(*)::int n from posts where not hidden and created_at >= now() - interval '7 days' group by 1 order by n desc, category limit 6`)).map((r) => `${r.category}:${r.n}`);
const gotPopular = (await as('anon', () => q(`select category, n::int n from popular_categories(7)`))).map((r) => `${r.category}:${r.n}`);
record(JSON.stringify(gotPopular) === JSON.stringify(expectedPopular), 'popular_categories = visible posts in the window, most active first', JSON.stringify(gotPopular));
const oneDay = await as('anon', () => q(`select category, n::int n from popular_categories(0)`));
record(Array.isArray(oneDay), 'popular_categories(0) clamps to one day instead of erroring');

// fixtures for the list functions
const one1 = async (sql, params) => (await q(sql, params))[0].id;
const rp = await one1(`insert into posts (anon_user_id, category, body) values ($1,'work','RDX post with three reports') returning id`, [RA]);
const rq = await one1(`insert into posts (anon_user_id, category, body) values ($1,'money','RDX post with one report') returning id`, [RB]);
const rh = await one1(`insert into posts (anon_user_id, category, body) values ($1,'work','RDX hidden reported post') returning id`, [RB]);
const rplain = await one1(`insert into posts (anon_user_id, category, body) values ($1,'work','RDX plain post') returning id`, [RA]);
await one1(`insert into posts (anon_user_id, category, body, hidden) values ($1,'money','RDX hidden plain post', true) returning id`, [RB]);
const ra = await one1(`insert into advices (post_id, anon_user_id, body) values ($1,$2,'RDX advice with two reports') returning id`, [rp, RB]);
await as('anon', async () => {
  for (const t of ['r-1', 'r-2', 'r-3']) await q(`select increment_report('post', '${rp}', '${t}')`);
  for (const t of ['r-1', 'r-2']) await q(`select increment_report('advice', '${ra}', '${t}')`);
  await q(`select increment_report('post', '${rq}', 'r-1')`);
  for (const t of ['r-1', 'r-2', 'r-3', 'r-4']) await q(`select increment_report('post', '${rh}', '${t}')`);
});
await q(`update posts set hidden = true where id = $1`, [rh]);

const svc = (sql, params) => as('service_role', () => q(sql, params));

// admin_reports_list
const rl = await svc(`select * from admin_reports_list(null, 'RDX')`);
record(
  JSON.stringify(rl.map((r) => `${r.item_type}:${r.report_count}`)) === JSON.stringify(['post:3', 'advice:2', 'post:1']),
  'reports list: most-reported first, posts and advice together, hidden items excluded',
  JSON.stringify(rl.map((r) => `${r.item_type}:${r.report_count}`)),
);
record(rl.every((r) => Number(r.total_count) === 3), 'reports list: total_count is the full count on every row');
record(rl.every((r) => r.latest_report_at !== null), 'reports list: each item carries the time of its latest report');
const onlyAdvice = await svc(`select * from admin_reports_list('advice', 'RDX')`);
record(onlyAdvice.length === 1 && onlyAdvice[0].item_type === 'advice', 'reports list: type filter');
const byAuthor = await svc(`select * from admin_reports_list(null, 'RDXB')`);
record(byAuthor.length === 2, 'reports list: search matches the author name', String(byAuthor.length));
const page2 = await svc(`select * from admin_reports_list(null, 'RDX', 1, 1)`);
record(page2.length === 1 && page2[0].item_type === 'advice' && Number(page2[0].total_count) === 3, 'reports list: paging keeps the total');
const clamped = await svc(`select * from admin_reports_list(null, 'RDX', 100000, 0)`);
record(clamped.length === 3, 'reports list: a huge limit is clamped, not an error');
const literalPercent = await svc(`select * from admin_reports_list(null, '\\%')`);
record(literalPercent.length === 0, 'reports list: an escaped % matches literally');

// admin_content_list
const cl = (args) => svc(`select * from admin_content_list(${args})`);
const all = await cl(`'all', 'RDX'`);
record(all.length === 6 && Number(all[0].total_count) === 6, 'content list: all = posts and advice together', String(all.length));
record((await cl(`'posts', 'RDX'`)).length === 5, 'content list: posts only');
record((await cl(`'advices', 'RDX'`)).length === 1, 'content list: advice only');
record((await cl(`'all', 'RDX', null, 'visible'`)).length === 4, 'content list: status visible excludes hidden items');
record((await cl(`'all', 'RDX', null, 'hidden'`)).length === 2, 'content list: status hidden');
record((await cl(`'all', 'RDX', null, 'flagged'`)).length === 3, 'content list: status flagged = reported and not hidden');
record((await cl(`'all', 'RDX', null, 'all', true`)).length === 4, 'content list: reported-only');
record((await cl(`'all', 'RDX', 'work'`)).length === 3, 'content list: a category filter applies to posts and leaves replies out', String((await cl(`'all', 'RDX', 'work'`)).length));
record((await cl(`'all', 'RDX-nothing'`)).length === 0, 'content list: no match gives no rows');
// RDXA wrote two of the fixtures (rp, rplain); RDXB wrote the other four (rq, rh, the hidden plain post, and the advice)
const byRdxA = await cl(`'all', 'RDXA'`);
const byRdxB = await cl(`'all', 'RDXB'`);
record(byRdxA.length === 2 && byRdxB.length === 4, 'content list: search matches the author name', `${byRdxA.length}/${byRdxB.length}`);
const times = all.map((r) => new Date(r.created_at).getTime());
record(times.every((t, i) => i === 0 || times[i - 1] >= t), 'content list: newest first');
const pageOne = await cl(`'all', 'RDX', null, 'all', false, 2, 4`);
record(pageOne.length === 2 && Number(pageOne[0].total_count) === 6, 'content list: paging keeps the total');
const advRow = all.find((r) => r.item_type === 'advice');
record(advRow && advRow.upvotes === 0 && advRow.category === null && advRow.pinned_at === null, 'content list: replies have upvotes and no category/pin');
await q(`update posts set pinned_at = now() where id = $1`, [rplain]);
record((await cl(`'posts', 'RDX plain'`))[0].pinned_at !== null, 'content list: posts carry pinned_at');

// admin_dashboard
await q(`insert into posts (anon_user_id, category, body, created_at) values ($1,'money','RDX-3d-a', now() - interval '3 days'),($1,'money','RDX-3d-b', now() - interval '3 days'),($1,'work','RDX-10d-a', now() - interval '10 days'),($1,'work','RDX-10d-b', now() - interval '10 days'),($1,'work','RDX-10d-c', now() - interval '10 days')`, [RA]);
await q(`insert into admin_login_attempts (ip, attempted_at) values ('1.1.1.1', now() - interval '2 hours'),('2.2.2.2', now() - interval '1 hour'),('3.3.3.3', now() - interval '30 hours')`);
const dash = parse((await svc(`select admin_dashboard() as d`))[0].d);
const direct = async (sql) => Number((await q(sql))[0].n);
const totals = dash.totals;
record(totals.posts === (await direct(`select count(*) n from posts`)), 'dashboard: totals.posts matches the table');
record(totals.advices === (await direct(`select count(*) n from advices`)), 'dashboard: totals.advices matches the table');
record(totals.anon_users === (await direct(`select count(*) n from anon_users`)), 'dashboard: totals.anon_users matches the table');
record(totals.hidden_items === (await direct(`select (select count(*) from posts where hidden)+(select count(*) from advices where hidden) n`)), 'dashboard: hidden_items counts posts and advice');
record(totals.open_reports === (await direct(`select (select count(*) from posts where report_count>0 and not hidden)+(select count(*) from advices where report_count>0 and not hidden) n`)), 'dashboard: open_reports excludes hidden');
record(totals.urgent_reports === (await direct(`select (select count(*) from posts where report_count>=3 and not hidden)+(select count(*) from advices where report_count>=3 and not hidden) n`)), 'dashboard: urgent_reports = 3 or more reports, not hidden');
record(totals.urgent_reports >= 1, 'dashboard: the 3-report fixture is urgent', String(totals.urgent_reports));
record(totals.new_content_24h === (await direct(`select (select count(*) from posts where created_at >= now()-interval '24 hours')+(select count(*) from advices where created_at >= now()-interval '24 hours') n`)), 'dashboard: new_content_24h');
record(totals.new_reports_24h === (await direct(`select count(*) n from reports where created_at >= now()-interval '24 hours'`)), 'dashboard: new_reports_24h');
record(totals.failed_signins_24h === (await direct(`select count(*) n from admin_login_attempts where attempted_at >= now()-interval '24 hours'`)) && totals.failed_signins_24h >= 2, 'dashboard: failed sign-ins counts the last 24 hours only', String(totals.failed_signins_24h));
const cur = await direct(`select count(*) n from posts where created_at >= now()-interval '7 days'`);
const prev = await direct(`select count(*) n from posts where created_at >= now()-interval '14 days' and created_at < now()-interval '7 days'`);
record(JSON.stringify(dash.week.posts) === JSON.stringify([cur, prev]) && prev >= 3, 'dashboard: week.posts = [last 7 days, the 7 before]', JSON.stringify(dash.week.posts));
const repCur = await direct(`select count(*) n from reports where created_at >= now()-interval '7 days'`);
record(dash.week.reports[0] === repCur, 'dashboard: week.reports counts report rows');
record(dash.daily.length === 7 && dash.daily.at(-1).day === (await q(`select to_char(now(), 'YYYY-MM-DD') d`))[0].d, 'dashboard: daily has 7 entries ending today');
const windowContent = await direct(`select (select count(*) from posts where created_at >= date_trunc('day', now())-interval '6 days')+(select count(*) from advices where created_at >= date_trunc('day', now())-interval '6 days') n`);
record(dash.daily.reduce((s, d) => s + d.content, 0) === windowContent, 'dashboard: daily content sums to the 7-day total');


console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
