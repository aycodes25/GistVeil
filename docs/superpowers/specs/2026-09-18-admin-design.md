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

The export route handler returns `401` instead of redirecting.

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

- **Hide:** replace the `posts` and `advices` anon SELECT policies with
  `using (not hidden)`. Hiding then works sitewide with no change to public
  queries: the feed, the post detail page (`.single()` → `notFound()`), the
  advice list, and embedded `advices(count)` all go through RLS.
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

**Dashboard.** Tiles for posts, advice, anon users, open reports, hidden items
and banned devices; a 30-day activity chart (inline SVG, no chart library);
per-category post counts.

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
pin/unpin (posts), delete forever, ban author.

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
Includes `hidden`, `report_count` and the author's anon name. **Never selects
`device_token`** — the operator has no need for it and an exported file is easy
to leak. CSV cells are quoted, and any cell beginning with `=`, `+`,
`-` or `@` is prefixed with `'` so user-written text can't run as a formula when
the file is opened in a spreadsheet.

## Public-site changes

1. **Feed order:** `pinned_at` desc (nulls last), then `created_at` desc.
   `PostCard` shows a "Pinned" badge. `Post` gains `pinned_at: string | null`.
2. **Announcement:** the feed page reads the `announcement` row from `settings`
   and renders a banner above the category tabs when non-empty.
3. **Safety filter:** `checkSafety(text, extraWords = [])` stays synchronous and
   pure. New `lib/blockedWords.ts` exports `fetchBlockedWords()` — anon SELECT
   from `blocked_words`, cached in module memory for 5 minutes, returning `[]` on
   any error. `NewPostPage` and `AddAdviceForm` (both already async on submit)
   await it and pass the result in. Matching stays case-insensitive substring,
   so false positives remain accepted, as in V1.
4. **Banned devices:** a rejected insert surfaces through the existing generic
   "Couldn't post right now. Try again." message. It deliberately does not
   reveal the ban.

## Data flow and errors

- **Reads:** server components call functions in `lib/admin/queries.ts`, which
  obtain the client via `getAdminClient()`.
- **Writes:** Server Actions in `app/admin/actions.ts`. Each one calls
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
app/admin/login/page.tsx
app/admin/(panel)/layout.tsx          nav + logout, not a security boundary
app/admin/(panel)/page.tsx            dashboard
app/admin/(panel)/reports/page.tsx
app/admin/(panel)/content/page.tsx
app/admin/(panel)/bans/page.tsx
app/admin/(panel)/settings/page.tsx
app/admin/export/route.ts
app/admin/actions.ts                  all Server Actions
lib/admin/session.ts                  pure: sign/verify JWT, password check, env validation
lib/admin/auth.ts                     server-only: cookies, verifyAdmin, login/logout
lib/admin/client.ts                   server-only: getAdminClient
lib/admin/throttle.ts                 throttle decision (pure) + attempts table access
lib/admin/queries.ts                  server-only reads
lib/admin/csv.ts                      pure: CSV quoting + formula neutralization
lib/blockedWords.ts                   public: fetchBlockedWords
supabase/admin.sql
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

**Automated** — `node:test` run through the existing `tsx` devDependency, no
new packages, exposed as `npm test`. Covers the pure modules only:
- `session.ts`: sign/verify round trip; expired, tampered and wrong-secret tokens
  rejected; missing or short secret/password throws (fail closed); password
  comparison for correct, incorrect and different-length input.
- `throttle.ts`: allowed below 5 failures, blocked at 5, window expiry.
- `csv.ts`: quoting of commas, quotes and newlines; formula-prefix neutralization.

**Manual checklist**, run against a real Supabase project before deploying (the
DB behavior can't be unit-tested here):
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
