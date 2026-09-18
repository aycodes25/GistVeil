# GistVeil admin — setup

The admin lives at `/admin` on the same site. It is protected by one password and, behind
that, a server-only Supabase service-role key. Design and rationale:
[`superpowers/specs/2026-09-18-admin-design.md`](superpowers/specs/2026-09-18-admin-design.md).

## 1. Environment variables

Add these to `.env.local` (local) and to the Vercel project (deployed). None of them may
start with `NEXT_PUBLIC_`.

| variable | what it is | rule |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → the `service_role` key (or the newer `sb_secret_…` key) | server-only; bypasses all row-level security |
| `ADMIN_PASSWORD` | the password you sign in with | at least 16 characters |
| `ADMIN_SESSION_SECRET` | signs the login cookie | at least 32 random characters |

If any of them is missing or too short, **the admin refuses to work** (login always fails
and every page redirects to the login screen). The server log names the variable, never its
value.

Generate the two secrets with, for example:

```
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # password
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # session secret
```

In Vercel, tick **Production** and also **Preview** if you want to try the admin on branch
previews. Changing an environment variable needs a redeploy to take effect.

## 2. Run `supabase/admin.sql`

Open the Supabase **SQL Editor**, paste the whole of [`supabase/admin.sql`](../supabase/admin.sql)
and run it. It is safe to run again.

**Run it before deploying code that uses it.** The public feed orders by the new `pinned_at`
column; the feed falls back gracefully if the column is missing, but nothing else in the admin
works until the script has run.

It changes the live database, so the first time consider doing it in a second (free) Supabase
project to check everything, then repeat in production. What it does:

- adds `hidden` / `pinned_at` columns and the `banned_devices`, `blocked_words`, `settings` and
  `admin_login_attempts` tables;
- makes hidden posts (and their replies) invisible to the public;
- blocks banned devices from posting or replying;
- **closes an existing gap**: anonymous visitors could insert posts or advice with any
  `report_count` / `upvotes`. They can now only set the columns the app actually sends;
- adds admin-only functions that only the service-role key can run.

After running it, open the public site, make a post and a reply, and confirm both still work.

## 3. Deploy and sign in

1. Merge the `admin-panel` branch when you are happy with it. Keep **Production** deploying from
   `main`, and use the branch's Preview deployments to try things first.
2. Open `https://<your-site>/admin` and sign in with `ADMIN_PASSWORD`.
3. Sessions last 12 hours. There is no per-session revocation: changing `ADMIN_SESSION_SECRET`
   signs everyone out.

## What you get

| page | for |
|---|---|
| Dashboard | totals, 30-day activity chart, posts by category |
| Reports | reported posts and advice, most-reported first: dismiss, hide, delete forever, ban author |
| Content | every post and advice: search, filters, pin, hide/unhide, delete, ban author |
| Bans | banned devices, with unban |
| Settings | announcement banner, blocked words, JSON/CSV export |

## Things worth knowing

- **Bans are per browser.** Identity is a random token in the visitor's browser storage, so
  someone who clears it gets a fresh identity. A ban is a speed bump, not a wall.
- **Hide is reversible; delete forever is not.**
- **Blocked words are public.** The filter runs in the visitor's browser, so every word you add
  can be read by anyone with the site's public API key.
- **Report counts are advisory.** The one-report-per-device rule can be sidestepped by anyone
  who calls the API directly, so treat the queue as a triage aid and judge the content itself.
- Exports never include device tokens. In the CSV, text starting with `=`, `+`, `-` or `@` is
  prefixed with an apostrophe so a spreadsheet can't run it as a formula.

## Checking your changes

```
npm test                 # 80 unit tests
npx tsc --noEmit
npm run build
```

To re-verify `admin.sql` itself (86 checks on an in-process Postgres, no Docker):

```
npm install --no-save @electric-sql/pglite
node supabase/tests/verify-admin-sql.mjs
```
