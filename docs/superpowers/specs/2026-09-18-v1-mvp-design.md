# GistVeil V1 — Design Spec

## Purpose

An anonymous web app where anyone can post a personal problem and get advice
from other anonymous users. No login, no email, no phone number. V1 is the
smallest slice that proves people will actually post and reply — text only,
no AI, no notifications, no money features. Those are later sub-projects,
only built if V1 shows real usage.

## Out of scope for V1

Voice notes, AI grammar-fix/rewrite, text-to-image cards, push notifications,
ads, paid boosts, therapist marketplace, sponsored categories. All deferred
until V1 has real posts from real users.

## Architecture

- **Frontend:** Next.js (App Router), TailwindCss, deployed to Vercel free tier.
- **Backend/DB:** Supabase (Postgres), accessed directly from the Next.js
  client via the Supabase JS client — no custom API server needed for V1.
- **Hosting cost:** $0/month at V1 scale (both Vercel and Supabase free
  tiers comfortably cover a few thousand rows and low traffic).

## Data model (Supabase / Postgres)

**`anon_users`**
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| anon_name | text | e.g. `Anon #1247`, generated client-side on first visit |
| device_token | text, unique | random token stored in localStorage, re-sent on every write to identify "this browser" |
| created_at | timestamptz | |

**`posts`**
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| anon_user_id | uuid, fk -> anon_users | |
| category | text | one of: relationship, money, family, work, mental_health, education |
| body | text | the problem text |
| report_count | int, default 0 | |
| created_at | timestamptz | |

**`advices`** (replies/comments)
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| post_id | uuid, fk -> posts | |
| anon_user_id | uuid, fk -> anon_users | |
| body | text | |
| upvotes | int, default 0 | |
| report_count | int, default 0 | |
| created_at | timestamptz | |

**`advice_votes`** — one row per (advice, device) upvote, enforces one vote per device per advice.
| column | type | notes |
|---|---|---|
| advice_id | uuid, fk -> advices | |
| device_token | text | |
| | | unique constraint on (advice_id, device_token) |

**`reports`** — one row per (target, device) report, enforces one report per device per item.
| column | type | notes |
|---|---|---|
| target_type | text | `post` or `advice` |
| target_id | uuid | |
| device_token | text | |
| | | unique constraint on (target_type, target_id, device_token) |

Row Level Security: anonymous (anon key) role gets INSERT on `posts`/`advices`/
`anon_users` and SELECT on all three; no UPDATE/DELETE from the client except
through the `increment_report` and `increment_upvote` RPC functions, so a
client can't rewrite someone else's post or forge report/upvote counts by
editing rows directly. Those RPCs insert into `advice_votes`/`reports` first
(which fails on the unique constraint if this device already acted) and only
then bump the counter on `posts`/`advices`.

## Anonymous identity

On first page load, the client checks localStorage for a device token. If
none exists: generate a random token, generate a display name (`Anon #` +
random 3-5 digit number), insert into `anon_users`, store both token and the
returned `anon_users.id` in localStorage. Every subsequent post/advice insert
uses that stored `anon_users.id`. Clearing browser storage resets identity —
that's an accepted limitation for V1, not a bug to fix.

## Core flows

### Feed (`/`)
- Lists posts newest-first with category filter tabs (All + 6 categories).
- Each card: anon name, relative time, category, first ~2 lines of body,
  reply count (count of `advices` for that post).
- No pagination needed at V1 scale beyond a simple "load more" (offset-based)
  once post count exceeds ~30.

### Create Post (`/post/new`)
- Textarea + category picker + submit.
- On submit, client runs the post through the safety filter (see below)
  before insert. On failure, show inline message naming what to remove
  (phone number / profanity) — do not silently discard, do not auto-edit.
- On success, redirect to the new post's detail page.

### Post Detail (`/post/[id]`)
- Full post body, category, timestamp.
- List of advices, sorted by upvotes desc then newest.
- Upvote button per advice (calls the `increment_upvote` RPC; one vote per
  device_token per advice, enforced via a `advice_votes` join table keyed on
  (advice_id, device_token) with a unique constraint — prevents trivial
  re-click spam without requiring accounts).
- Plain textarea to add advice, same safety filter as posting.
- Report button on the post and on each advice (calls `increment_report` RPC;
  same one-report-per-device_token-per-item constraint via a `reports` table).

### Categories
Fixed list, not user-editable in V1: Relationship, Money, Family,
Work/Career, Mental Health, Education. Stored as a TypeScript enum, mirrored
as a Postgres check constraint on `posts.category`.

## Safety filter (client-side, pre-insert)

A single function `checkSafety(text): { ok: boolean; reason?: string }` run
before any insert to `posts` or `advices`:

1. **Phone numbers:** regex matching common Nigerian/international phone
   patterns (7+ consecutive digits, with optional spaces/dashes/+prefix).
2. **Profanity/slurs:** match against a static wordlist (small, curated list
   shipped in the repo, not fetched remotely).

If either matches, block the insert and show the specific reason inline.
This is a blunt instrument by design — false positives are acceptable for
V1; the alternative (nothing) is not, given the target content (school
groups, personal problems) is likely to attract exactly the phone-number-
sharing and harassment patterns this guards against.

Report counts are surfaced only to you (manual review — see "Testing" below)
in V1; there is no auto-hide threshold yet.

## Error handling

- Supabase insert failures (network, RLS rejection): show a generic "couldn't
  post, try again" toast; do not expose raw Supabase error text to users.
- Empty/whitespace-only post or advice body: blocked client-side before
  hitting the safety filter or the network.
- Missing category on post creation: blocked client-side, category is
  required.

## Testing

No automated test suite for V1 — this is a single-developer MVP meant to
validate demand, not a system with a long maintenance horizon yet. Manual
verification before sharing the link:
1. Seed ~10 realistic posts across categories (as originally planned, to
   avoid an empty-feed cold start).
2. Walk the three flows end-to-end in a real browser: post → appears in feed
   → open detail → add advice → upvote → report.
3. Confirm the safety filter blocks a test phone number and a test slur, and
   that the inline error message is specific enough to act on.
4. Confirm a second browser (or incognito window) gets its own anon identity
   and can see/reply to the first browser's post.

## Open questions deferred to later sub-projects

- Push notifications ("everyone gets alert on new post") — needs a mobile
  app or web-push infra, deferred until V1 shows retention.
- AI grammar-fix / voice notes / image cards — deferred until there's a
  monetization or retention case for the added API cost and complexity.
- Any monetization (ads, boosts, therapist marketplace) — deferred until
  there's meaningful DAU, per the original chat's own timeline.
