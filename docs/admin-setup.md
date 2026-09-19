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

**Run it before deploying code that uses it, and run it again for the redesign.** The redesigned
dashboard, Reports and Content pages, the public "Trending Topics" card and the banner's title,
colour and on/off switch all rely on functions and a policy that this script adds. It is safe to
run as many times as you like. Without the new parts the public feed still works (the banner and
Trending Topics simply don't appear), but the admin pages will show an error until it has run.

It changes the live database, so the first time consider doing it in a second (free) Supabase
project to check everything, then repeat in production. What it does:

- adds `hidden` / `pinned_at` columns and the `banned_devices`, `blocked_words`, `settings` and
  `admin_login_attempts` tables;
- makes hidden posts (and their replies) invisible to the public;
- blocks banned devices from posting or replying;
- **closes an existing gap**: anonymous visitors could insert posts or advice with any
  `report_count` / `upvotes`. They can now only set the columns the app actually sends;
- lets the public site read the four banner rows in `settings` (`announcement`,
  `announcement_title`, `announcement_theme`, `announcement_active`) and nothing else there;
- adds `popular_categories()` (the public "Trending Topics" card) and the admin-only functions
  (`admin_dashboard`, `admin_reports_list`, `admin_content_list`, `admin_stats`, the moderation
  functions and more), which only the service-role key can run.

After running it, open the public site, make a post and a reply, and confirm both still work.

## 3. Deploy and sign in

1. Run `supabase/admin.sql` (section 2), then merge the branch when you are happy with it. Keep
   **Production** deploying from `main`, and use the branch's Preview deployments to try things
   first.
2. Open `https://<your-site>/admin` and sign in with `ADMIN_PASSWORD`.
3. Sessions last 12 hours. There is no per-session revocation: changing `ADMIN_SESSION_SECRET`
   signs everyone out.

## What you get

| page | for |
|---|---|
| Dashboard | four totals with week-on-week change, a 7-day growth chart, the most urgent reports, posts by category |
| Reports | the moderation queue, most-reported first, with Low / Medium / High severity: dismiss, hide, delete forever, ban author, and bulk dismiss / hide |
| Content | all content, posts only or replies only: search, filters, CSV export, pin, hide / unhide, delete, ban author, and bulk hide / unhide / delete |
| Bans | banned identities, with unban |
| Settings | the site banner (title, message, colour theme, on/off), blocked words, JSON / CSV export, live system figures |

Every page and every action re-checks the admin session on the server, including each item of a
bulk action, so the sidebar and the buttons are convenience, not security.

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
npm test                 # 172 unit tests
npx tsc --noEmit
npm run build
```

To re-verify `admin.sql` itself (135 checks on an in-process Postgres, no Docker):

```
npm install --no-save @electric-sql/pglite
node supabase/tests/verify-admin-sql.mjs
```
