# GistVeil Admin — Design Spec

## Purpose

A private admin area for the single operator to moderate GistVeil: review
reported content, hide or delete it, ban abusive devices, watch activity, and
manage a few site-wide settings. It is the "manual review" surface the V1 spec
assumed ("Report counts are surfaced only to you") but never built.

## Scope

In:

1. Moderation queue — reported posts and advice, most-reported first.
2. Content browser — every post and advice, with search and filters.
3. Ban devices — block a `device_token` from posting or replying.
4. Stats dashboard — totals, per-category counts, 30-day activity.
5. Pin/feature posts — pinned posts sort first in the feed.
6. Site announcement — one banner shown on the feed.
7. Blocked-words editor — extends the client-side safety filter from the DB.
8. Data export — posts and advice as JSON or CSV.

Out: multiple admins or roles, an audit log, auto-hide thresholds, editing
post/advice text, admin notifications (email/push), server-side enforcement of
the safety filter, bans that survive a user clearing browser storage.

## Architecture

- Lives at `/admin/*` in the existing Next.js app, same Vercel deployment.
- **Auth:** one shared password → signed session cookie.
- **Privileged DB access:** a server-only Supabase client using the
  service-role key (bypasses RLS). Public pages keep using the anon key.
- **Dependency:** `jose` (JWT). `server-only` needs no install — Next aliases it.
- Styling matches the public site (black, purple accent, Tailwind), with a
  wider container than the public `max-w-xl`.

### Environment variables

| name | purpose | rule |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | privileged DB access | server-only; never `NEXT_PUBLIC_` |
| `ADMIN_PASSWORD` | the login password | at least 16 characters |
| `ADMIN_SESSION_SECRET` | signs session cookies | at least 32 characters |

The operator sets these in `.env.local` and in Vercel. **Fail closed:** if any
is missing or too short, login always fails, `verifyAdmin()` redirects, and the
reason (variable name only, never the value) goes to the server log.

### Session

- HS256 JWT via `jose`, payload `{ role: 'admin' }`, 12-hour expiry.
- Cookie `admin_session`: HttpOnly, Secure in production, SameSite=Strict,
  Path=`/admin`.
- Password check: SHA-256 both values, compare with `crypto.timingSafeEqual`.
- Stateless: a single session can't be revoked. Logout clears the cookie;
  rotating `ADMIN_SESSION_SECRET` invalidates every session.
- Server Actions rely on Next's built-in Origin/Host check for CSRF.

### Enforcement layers

1. **`proxy.ts`** (project root; Node.js runtime by default in Next 16).
   Matcher `/admin/:path*`, exempting `/admin/login`. Verifies the cookie
   signature and expiry only — no DB access — and redirects to `/admin/login`.
   Optimistic only: the Next docs warn that Server Functions can escape a
   proxy matcher, so this is never the sole check.
2. **`verifyAdmin()`** runs in every admin page and every Server Action.
   Unauthenticated callers are redirected to `/admin/login`. The panel layout
   renders navigation but is not a security boundary (layouts don't re-render
   on navigation).
3. **`getAdminClient()`** is the only way to obtain the service-role client
   and calls `verifyAdmin()` itself, so DB access without an auth check can't
   be written by accident. The one exception is the login throttle, which runs
   before auth and uses an unchecked client confined to `throttle.ts`.

`/admin/export` answers `401` instead of redirecting — in `proxy.ts`, and again in
the route handler itself, which is the check that actually protects the data if the
proxy is ever bypassed.

### Login throttle

Table `admin_login_attempts`. Before comparing the password, count failures for
the caller's IP in the last 15 minutes; 5 or more → reject with "Too many
attempts. Try again later." without checking the password. A failure inserts a
row; a success deletes that IP's rows; rows older than 24 hours are pruned on
each attempt. IP is the first entry of `x-forwarded-for` (set by Vercel),
falling back to `unknown`.

This is a second layer. The primary defense is a long random password; a
per-IP throttle does not stop a distributed guesser.

### Response headers

All `/admin/*` responses send `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and
`robots: noindex, nofollow`.

## Data model changes

All in one re-runnable `supabase/admin.sql` (`if not exists` / `drop ... if
exists`), run by the operator in the Supabase SQL editor like `schema.sql`. The
file grows with each build step below and is re-run before deploying that step.

### New columns

| table | column | notes |
|---|---|---|
| `posts` | `hidden` boolean not null default false | |
| `posts` | `pinned_at` timestamptz null | set = pinned |
| `advices` | `hidden` boolean not null default false | |

### New tables

| table | columns | access |
|---|---|---|
| `banned_devices` | `device_token` text pk, `reason` text, `banned_at` timestamptz default now() | RLS on, no policies (service role only) |
| `blocked_words` | `word` text pk (stored lowercase, trimmed), `created_at` | RLS on, anon SELECT |
| `settings` | `key` text pk, `value` text not null, `updated_at` | RLS on, anon SELECT only where `key = 'announcement'` |
| `admin_login_attempts` | `id` bigint identity pk, `ip` text, `attempted_at` timestamptz default now(); index on `(ip, attempted_at)` | RLS on, no policies |

### Policy and privilege changes

- **Hide:** replace the `posts` anon SELECT policy with `using (not hidden)` and
  the `advices` one with `using (not hidden and exists (select 1 from posts p where
  p.id = advices.post_id))`. The subquery runs under the caller's RLS, so it only
  finds posts anon may see: **hiding a post hides its whole thread**, not just the
  post row. (The SQL harness caught this: with `not hidden` alone, a hidden post's
  replies stayed readable through the API.) Hiding then works sitewide with no
  change to public queries: the feed, the post detail page (`.single()` →
  `notFound()`), the advice list, and embedded `advices(count)` all go through RLS.
- **Ban:** replace the `posts` and `advices` anon INSERT policies with
  `with check (not is_banned(anon_user_id))`. `is_banned(uuid)` is
  `security definer`, `stable`, `set search_path = public`; it is true when the
  user's `device_token` is in `banned_devices`. Anon needs EXECUTE on it because
  policy expressions run as the caller.
- **Column-level INSERT:** revoke table-level INSERT on `posts` and `advices`
  from anon and grant it only on the intended columns — `posts`
  (`anon_user_id`, `category`, `body`) and `advices` (`post_id`, `anon_user_id`,
  `body`). This closes an existing gap: the V1 policies are `with check (true)`
  and anon has table-wide INSERT, so a client can insert rows with arbitrary
  `report_count` or `upvotes`. It also stops a client from setting `pinned_at`
  or `hidden`. `seed.sql` runs as the SQL-editor role and is unaffected.

### Admin-only functions

Each is called through the service-role client. `admin.sql` revokes EXECUTE from
`public`, `anon` and `authenticated` on all of them — Postgres and Supabase
grant EXECUTE to those roles by default, so the revoke is required — and grants
it to `service_role`. Multi-statement work lives here so it is atomic.

| function | behavior |
|---|---|
| `admin_stats(p_days int default 30)` | One JSON document: totals (posts, advices, anon_users, hidden items, banned devices, open reports), per-category post counts, and a per-day series (posts, advices, new users) using `generate_series`. "Open report" means `report_count > 0` and not hidden. Totals, category counts and the daily series include hidden items, since they describe what users did. SQL rather than JS because Supabase caps API responses at 1000 rows, which would silently undercount. |
| `admin_dismiss_reports(p_target_type, p_target_id)` | Deletes that item's `reports` rows and sets its `report_count` to 0. |
| `admin_delete_content(p_target_type, p_target_id)` | Deletes the item's `reports` rows (for a post, also its advices' rows — `reports` has no foreign key, so they would be orphaned), then the item. Deleting a post cascades to advices and votes. |
| `admin_ban_author(p_anon_user_id, p_reason, p_hide_content)` | Inserts the author's `device_token` into `banned_devices` (no-op if present). If `p_hide_content`, sets `hidden = true` on all their posts and advices. |
| `admin_bans()` | Banned devices with the author's anon name and their post/advice counts, in one query (avoids an N+1 on the bans page). |

Unban, hide/unhide, pin/unpin, announcement and blocked-word edits are single
statements and go through plain PostgREST calls.

## Admin pages

The authenticated shell is a `(panel)` route group so `/admin/login` and the
export handler don't inherit the nav. State such as filters and page number
lives in the URL.

| route | purpose |
|---|---|
| `/admin/login` | password form; generic error on failure |
| `/admin` | dashboard |
| `/admin/reports` | moderation queue |
| `/admin/content` | content browser |
| `/admin/bans` | banned devices |
| `/admin/settings` | announcement and blocked words |
| `/admin/export` | route handler (download) |

**Dashboard.** A row of stat tiles (posts, advice, anonymous users, open reports,
hidden items, banned devices; the last three link to their pages); a 30-day
activity chart; posts by category. The window is fixed at 30 days, so there is no
date filter and every number on the page describes the same slice. The chart
follows the dataviz skill: three lines on ONE shared axis (all are counts per day,
so no dual axis), 2px lines, legend with line keys and window totals, a crosshair
tooltip that lists every series, keyboard navigation (Tab, arrows, Home, End,
Escape), and a "View as table" twin. It is inline SVG with no chart library. The
three series colours were checked with the palette validator against the real card
surface (worst adjacent colour-blind separation ΔE 9.4, normal vision 26.5, all
≥ 3:1). They are dark-only tokens, because the admin has no light theme. There are
no direct end labels: on a small site the lines converge near zero and labels would
collide, so the legend, tooltip and table carry identity. Posts by category is a
single-colour horizontal bar chart with the value at each bar tip.

**Reports.** Posts and advice with `report_count > 0` and not hidden, merged
into one list sorted by `report_count` desc then `created_at` desc. Each shows
a type badge, the full body, author anon name, category (posts) or a link to
the parent post (advice), report count and age. The top 50 of each table are
fetched and merged; the page shows "Showing top 50 of N". Actions:
- **Dismiss** — `admin_dismiss_reports`.
- **Hide** — sets `hidden = true`; the item leaves the queue (unhiding keeps
  its report count, so it returns).
- **Delete forever** — `admin_delete_content`, after confirmation.
- **Ban author** — `admin_ban_author`, after confirmation, with an "also hide
  all their content" checkbox that defaults on (hide is reversible).

**Content.** Posts | Advice toggle; body search (`ilike`, with `%`, `_` and
`\` escaped); category filter (posts); status filter (all / visible / hidden);
reported-only toggle; 25 per page, offset-based. Row actions: hide/unhide,
pin/unpin (posts), delete forever, ban author. A page past the end (a stale link,
or the last item on the last page was just deleted) redirects to the last page that
exists: PostgREST answers such a request with `416` (`PGRST103`), which
`fetchContent` turns into "no rows, here is the real total".

**Bans.** Lists banned devices with reason, date, the anon name(s) tied to the
token, and the count of their posts and advice; the token shows only its first
8 characters. Unban is one click.

**Settings.**
- *Announcement:* textarea, max 280 characters; empty removes the banner.
- *Blocked words:* list with remove; add accepts comma- or newline-separated
  entries, each trimmed, lowercased, max 60 characters, de-duplicated.

**Export.** `GET /admin/export?type=posts|advices&format=json|csv`. Streams the
response (`ReadableStream`) in 1000-row pages ordered by `created_at, id`, so
neither the row cap nor Vercel's non-streaming response size cap applies.
Includes `hidden`, `report_count`, `anon_user_id` and the author's anon name.
**Never selects `device_token`** — the operator has no need for it and an exported
file is easy to leak. Rows come out oldest first. An offset past the last row
(the total is an exact multiple of 1000) is the same `416`, treated as "no more
rows". Invalid `type` or `format` returns `400`. CSV is UTF-8 with a BOM (so Excel
reads accents and emoji), every text cell is quoted, and any cell beginning with
`=`, `+`, `-`, `@`, tab or CR is prefixed with `'` so user-written text can't run
as a formula when the file is opened in a spreadsheet. If a page fails partway the
stream is errored rather than closed, so the download fails visibly instead of
producing a valid-looking but truncated file.

## Public-site changes

1. **Feed order:** `pinned_at` desc (nulls last), then `created_at` desc.
   `PostCard` shows a "Pinned" badge. `Post` gains `pinned_at`. If `admin.sql` has
   not been run, `pinned_at` doesn't exist and PostgREST answers `42703`; the feed
   then retries without pin ordering, so an un-migrated database never blanks the
   public feed (tested by removing the column from a real database).
2. **Announcement:** the feed page reads the `announcement` row from `settings`
   and renders a banner above the category tabs when non-empty.
3. **Safety filter:** `checkSafety(text, extraWords = [])` stays synchronous and
   pure; blank extra words are skipped (an empty string is a substring of
   everything and would block every post). `lib/blockedWords.ts` exports
   `fetchBlockedWords()` — anon SELECT from `blocked_words` — built from
   `createWordsLoader` in `lib/blockedWordsCache.ts`: cached for 5 minutes; on any
   failure it returns the last good list, or `[]`, and never caches the failure, so
   fetching the list can never stop someone posting. `NewPostPage` and
   `AddAdviceForm` await it and pass the result in; they set `submitting` *before*
   that await so a double-click can't submit twice while the list loads. Matching
   stays case-insensitive substring, so false positives remain accepted, as in V1.
4. **Banned devices:** a rejected insert surfaces through the existing generic
   "Couldn't post right now. Try again." message. It deliberately does not
   reveal the ban.
5. **Related fix (separate commit):** the scaffold's `globals.css` switched
   `--background` on `prefers-color-scheme` in an *unlayered* `body` rule, which
   beats Tailwind 4's layered `bg-black`. For anyone whose browser is in light mode
   that put a white page behind the UI's white headings, so titles — including the
   public feed's — were invisible. The theme is now unconditionally dark with
   `color-scheme: dark`. It predates the admin but made the admin unreadable in
   light mode, so it is fixed here.

## Data flow and errors

- **Reads:** server components call functions in `lib/admin/queries.ts`, which
  obtain the client via `getAdminClient()`.
- **Writes:** Server Actions in `app/admin/actions/{auth,moderation,settings}.ts`. Each one calls
  `getAdminClient()` (verifying the session), validates input (UUID format, enum
  values, lengths), performs the write, then `revalidatePath`s the affected
  admin routes.
- **Results:** actions return `{ ok: true } | { ok: false, error }`. The UI shows
  a generic inline message; the full error goes to `console.error` (visible in
  Vercel logs). Raw Supabase error text is never rendered.
- **Confirmation:** destructive actions (delete forever, ban) use a two-step
  button — the first click turns the button into "Confirm …" — not
  `window.confirm`.
- **Atomicity:** multi-statement operations run inside the SQL functions above,
  so a failure leaves nothing half-done.

## Code layout

```
proxy.ts
next.config.ts                        + hardening headers on /admin/*
app/admin/login/{page,LoginForm}.tsx
app/admin/(panel)/layout.tsx          nav + logout, not a security boundary
app/admin/(panel)/error.tsx           error boundary
app/admin/(panel)/page.tsx            dashboard
app/admin/(panel)/{reports,content,bans,settings}/page.tsx
app/admin/export/route.ts
app/admin/actions/{auth,moderation,settings}.ts   all Server Actions
components/admin/                     NavLink, ActionButton, BanButton, StatTile,
                                      CategoryBars, ActivityChart, SettingsForms
lib/admin/session.ts                  pure: sign/verify JWT, password check, env validation
lib/admin/throttle.ts                 pure: throttle rules, IP parsing
lib/admin/validate.ts                 pure: ids, enums, LIKE escaping, word lists, paging
lib/admin/csv.ts                      pure: CSV quoting + formula neutralization
lib/admin/chartMath.ts                pure: nice axis scale, ticks, day snapping
lib/admin/types.ts                    shared types (pure)
lib/admin/serviceClient.ts            server-only, UNCHECKED; only client.ts and loginAttempts.ts import it
lib/admin/client.ts                   server-only: getAdminClient (verifies first)
lib/admin/auth.ts                     server-only: cookie session, verifyAdmin
lib/admin/loginAttempts.ts            server-only: throttle table access
lib/admin/queries.ts                  server-only reads
lib/blockedWords.ts, blockedWordsCache.ts   public: fetchBlockedWords + its cache/fallback
supabase/admin.sql
supabase/tests/verify-admin-sql.mjs   PGlite harness for admin.sql
scripts/test.mjs                      runs every lib/**/*.test.ts
docs/admin-setup.md
```

Pure logic lives in files that do not import `server-only`, so it can be tested
under plain Node; the `server-only` shells around it stay thin.

## Limits and known trade-offs

1. **Bans are per browser.** Identity is a `device_token` in localStorage;
   clearing storage yields a fresh identity. This is the V1 spec's accepted
   limitation — treat a ban as a speed bump.
2. Bans block posting and replying only. Voting and reporting go through the
   existing RPCs and are unaffected (each is still one per device per item).
3. `is_banned` is callable by anon, so anyone holding an `anon_user_id` (which is
   public in post data) can learn whether that author is banned. Accepted.
4. **Blocked words are public.** The client filter needs the list, so every word
   added in the admin is readable by anyone with the anon key. The filter also
   stays client-side and bypassable by calling the API directly, as in V1. A
   `before insert` trigger would enforce it server-side and keep the list private;
   that is a possible follow-up and out of scope here.
5. Sessions can't be individually revoked (see Session).
6. The login throttle is per IP and does not stop distributed guessing.
7. **Report counts and upvotes are advisory.** `increment_report` and
   `increment_upvote` accept any `device_token` string, so "one per device" is a
   speed bump, not a guarantee (a V1 limitation this spec does not change). The
   moderation queue is a triage aid; the operator judges the content itself.
   Separately, the `anon_users` SELECT policy lets anyone with the anon key read
   every `device_token`. Restricting that is a possible follow-up, out of scope.

## Testing

**Automated unit tests** — `node:test` run through the existing `tsx` devDependency,
no new packages, exposed as `npm test` (80 tests). They cover the pure modules only:

- `session.ts`: sign/verify round trip; expired, tampered, wrong-secret, `alg: none`
  and wrong-role tokens rejected; missing or short secret/password throws (fail
  closed, and the message never contains the value); password comparison.
- `throttle.ts` and `validate.ts`: throttle limit and window; IP parsing; UUID and enum
  checks; LIKE escaping; word-list parsing; announcement length; page parsing.
- `csv.ts`: quoting of commas, quotes and newlines; formula-prefix neutralization.
- `chartMath.ts`: axis scale and ticks, tick placement, day formatting, pointer snapping.
- `safetyFilter.ts` and `blockedWordsCache.ts`: extra words, blank entries, and the
  cache/fallback rules (a failed fetch never blocks posting).

**SQL harness** — `supabase/tests/verify-admin-sql.mjs` applies `schema.sql`, `seed.sql`
and `admin.sql` (twice) to an in-process Postgres (PGlite) with Supabase-style roles and
makes 86 checks: column privileges, RLS, thread hiding, bans, every admin function and
its EXECUTE grants. It is not a project dependency; see the file header for the one-off
`npm install --no-save` it needs.

**End-to-end run against real Postgres + PostgREST.** With no Docker available, the
whole admin was also driven in a real browser against a local Postgres 18 and PostgREST
12 built from an npm package and a release binary, with `schema.sql`, `seed.sql` and
`admin.sql` applied. That covers everything in the checklist below except a
Vercel/Supabase-hosted run. It found and fixed: the thread-hiding gap (above), a `416`
crash on an out-of-range content page, a `416` at exact export page multiples, an
announcement confirmation wiped by a remount, and the light-mode theme bug.

**Manual checklist**, to repeat against your own Supabase project before deploying:
1. Logged out: every `/admin/*` page redirects to login; the export returns 401;
   a Server Action invoked without the cookie is rejected.
2. Login: a wrong password 5 times is throttled; the right one reaches the
   dashboard; logout returns to login; a tampered or expired cookie returns to
   login.
3. Unset `ADMIN_PASSWORD` locally: login refuses (fail closed).
4. Report a post from two browsers → it appears with count 2 → Dismiss → it
   disappears, its `report_count` is 0 and its `reports` rows are gone.
5. Hide a post → gone from the feed, 404 on its detail page, hidden advice not
   counted; unhide → back.
6. Delete forever a post with advice, votes and reports → all gone, no orphaned
   `reports` rows.
7. Ban an author with "hide content" → that browser's post and reply are
   rejected with the generic error and their content is hidden; unban → posting
   works again.
8. Direct anon API insert including `pinned_at`, `report_count`, `upvotes` or
   `hidden` → rejected by the column privileges.
9. Pin → top of the feed and of its category tab; unpin → normal order.
10. Announcement appears on the feed; clearing it removes the banner.
11. Add a blocked word → a post containing it is blocked on the public form;
    remove it → allowed.
12. Export JSON and CSV: no `device_token`; a body starting with `=` is
    neutralized; with more than 1000 rows (seed via `generate_series`) the
    export is complete.
13. Dashboard totals match the table counts in Supabase.
14. After `next build`, `.next/static` contains neither the service-role key nor
    the string `service_role`.

## Delivery

Build order — each step ships on its own:
1. Auth, admin shell and the SQL foundations (`hidden`, column grants,
   `banned_devices`, `is_banned`, `admin_login_attempts`), plus logout.
2. Reports queue, content browser and bans.
3. Stats dashboard.
4. Pin, announcement, blocked words and export.

**Deployment order matters.** Run `supabase/admin.sql` *before* deploying code
that references the new columns, or the feed's `pinned_at` ordering will error
and the public feed will break. Then add the three env vars in Vercel and
redeploy.
