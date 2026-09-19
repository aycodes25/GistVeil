# GistVeil UI Redesign: Design Spec

## Purpose

Restyle every page of GistVeil, public site and admin, to match the ten Visily mockups
(`public/visily-multiscreens (2)/`, moved to `design/reference/`), using the logo and images the
owner supplied. The app keeps doing what it does today. Only presentation changes, plus a small
set of additions that give mockup elements something real to do.

## Decisions

Made by the owner:

- **Fidelity: exact look, real data only.** Layout, colours, type, spacing, logo and images match
  the mockups. Anything the mockups show that the app has no feature or data for is left out or
  replaced by a real number. The admin never shows an invented statistic.
- **Target screens:** the ten detailed Visily screens. The three-screen strip (dark navy sidebar)
  is an earlier draft and is not a target.
- **Public additions:** working search, and load-more paging on the feed. A search with no matches
  shows the 404-style page, with the search box, **Return Home** and **Load more posts**.
- **Admin additions:** banner title / colour theme / on-off switch; an **All Content** tab
  (posts and replies together); bulk actions.
- **Copy:** mockup text that claims things the app does not do is reworded to true statements.
- **Not included:** the New Post safety checkbox and 2,000-character limit; "Trust this browser
  for 30 days"; the mockups' invented features (see each screen).

**Out of scope, and its own sub-project afterwards:** anonymous visitors messaging the admin, with
the admin replying. It needs new tables, private storage and an inbox, and gets its own spec once
this redesign has established the visual system. See "Follow-on".

## What "exact" means here

The mockups contain sample content and stock-style photographs, so a pixel-identical render is not
achievable and would not be meaningful. The commitment is:

- the same structure and components on every screen;
- colours sampled from the mockups, matched within a small tolerance;
- the same type scale, weights, radii, shadows and spacing, matched to within a couple of pixels on
  measured elements (sidebar width, top-bar height, card padding, table row height);
- the supplied logo and images in the positions the mockups place them.

Two things exist only inside the mockup images and cannot be reproduced exactly: the **avatar
photos** and the **Settings banner art**. Avatars become a generated abstract avatar (deterministic
from the anon name). The banner is cropped from the mockup or recreated in CSS; either is lower
quality than a supplied original, and the owner can drop in a better file later. Also, the logo's
"VEIL" is white with an outline, so it is nearly invisible on the light sidebar, exactly as in the
mockups. It is matched, and flagged, not "fixed".

## Foundations

### Theme and tokens

Light only. The dark theme is removed (`color-scheme: light`). Values sampled from the mockups (each
is re-sampled per element during the build):

| token | value | used for |
|---|---|---|
| page | `#f6f6f9` | page and top bar |
| sidebar | `#e5e5e8` | sidebar |
| primary | `#7c3aed` | buttons, active tab/nav, links |
| chip | `#eae3f7` | icon chips, soft purple surfaces |
| promise card | `#e9e3f8` | "GistVeil Promise" card |
| pill | `#ededf0` | inactive tabs |
| ink | `#1f1f24` | headings, numbers |
| muted | `#71717a` | secondary text |
| teal | `#00a9b3` | chart bars |
| danger | `#ed6c6d` | Sign Out, destructive text |

Tokens live in the Tailwind theme in `app/globals.css`, so no component hard-codes a hex.

### Typography

A geometric sans. The exact family is identified during the build by rendering candidates next to
the mockup (headings look like Outfit; body like Inter). Loaded with `next/font`, self-hosted, no
layout shift. The scale (sizes and weights) is measured from the mockups.

### Layout and responsive

Reference width 1440px: a 256px sidebar, a top bar, then content. The mockups are desktop only, and
most visitors are on phones, so below 1024px the sidebar becomes a slide-over menu opened from the
top bar, cards stack, and admin tables scroll horizontally inside their card. This is designed to
the same visual system but is not in the mockups.

### Assets

Used: `GISTVEIL-LOGO.png` (sidebar, login), `privacy.png` (feed hero), `doorpurple.png` (404),
`imagepeople.png` (New Post panel). They move to `public/images/` and are rendered with
`next/image`.

Not served any more, because everything in `public/` is public: the mockup folder, the strip
screenshot and the six generated `magnific_…` explorations move to `design/`.

- `design/reference/` holds the ten mockups and is committed, since they are the spec.
- `design/brand-explorations/` holds the generated images (about 8 MB) and is **gitignored**, so the
  repository does not grow permanently. The owner can override this.

The five starter SVGs the owner deleted stay deleted; nothing references them.

### Shared UI kit and shells

The mockups are one system, so the build creates a small kit first (`components/ui/`): Button, Card,
Badge, Pill/Tabs, Avatar, Toggle, StatCard, DataTable, RowMenu, SearchInput, Select, EmptyState,
Breadcrumbs. Two shells sit on it:

- **PublicShell:** sidebar (logo; Home Feed, New Post; user chip) and top bar (breadcrumbs, page
  title, search, user chip).
- **AdminShell:** the same, plus an ADMIN CONTROL section (Dashboard, Reports, Content, Bans,
  Settings) and Sign Out. The COMMUNITY links (Home Feed, New Post) let the owner return to the site.
  Admin links never appear in the public shell. The login page has no shell.

The **user chip** shows `Anon #NNNN` when this browser already has an identity, and "Anonymous"
otherwise. Identity is created only on first post, vote or report, as today, so page views never
write to the database.

The notification bell is omitted (there are no notifications).

## Screens

For each screen: what is built, the real data behind it, and what is left out.

### Feed `/` (Discover Advice)

- **Hero:** veil image, "Refined Anonymity" pill, headline "A Safe Space for Unfiltered Advice",
  subtitle, **Share Your Story** (to `/post/new`) and **Browse Anonymously** (scrolls to the feed).
- **Filter bar:** tabs **All** plus the app's six categories (Relationship, Money, Family,
  Work/Career, Mental Health, Education). The mockup's tabs (Career, Relationships, Technology,
  Finance, Wellness, Legal) do not match the app's categories one for one, and Technology and Legal
  have no equivalent. The tabs keep the app's real categories and their current names; no category
  is created or renamed. A search field filters by text. The filter-icon button is omitted.
- **Latest Conversations:** "Showing N results" (real), "Sort by: Recent" (static; recent is the
  only order, plus pinned first).
- **Cards (two columns):** avatar, category tag, **Pinned** tag (real), time, a title and excerpt
  split from the post text (first sentence is the title; rule in `splitPostText`, unit-tested; no
  new data), reply count (real), share icon (copies the post link, or opens the device share sheet),
  **Read More**. The like hearts and counts are omitted (posts have no likes).
- **View More Posts:** loads the next page of posts (30 at a time).
- **Search:** `/?q=…` matches post text. No results renders the 404 layout ("Lost in the Veil",
  adapted: no posts match) with the search box prefilled, **Return Home** and **Load more posts**
  (the latest posts below it).
- **Right column:** **Trending Topics** becomes real popular categories over the last 7 days (link to
  that tab, with counts). **GistVeil Promise** and **Community Norms** are static, with the promise
  text made true (see Copy).
- **Footer:** copyright line only; the mockup's Privacy Policy, Terms and Safety Center pages do not
  exist, so those links are dropped. The announcement banner (when active) sits above the tabs.

### New Post `/post/new` (Compose Advice Request)

- Layout, "NEW ANONYMOUS POST" eyebrow, "Share your thoughts calmly.", the family-in-veil image
  panel, Your Privacy Matters, Quality Checklist, **What happens next?**, an encryption note and the
  **Need immediate support?** card.
- **Form:** category select (the six real categories), the situation text box with a character counter
  (no limit), the "Min. 50 characters for better responses" hint (a hint only, not enforced), **Post
  Anonymously**, **Cancel and Discard** (returns to the feed).
- **Left out:** the Brief Headline field (there is no headline field) and its checklist item; the
  guidelines checkbox.
- Behaviour unchanged: empty and no-category checks, the safety filter with its specific messages,
  the generic failure message, redirect to the new post.

### Post page `/post/<id>` (Viewing Advice Request)

- Breadcrumbs (Home Feed > category > Post Detail), Back to community feed, **Share** (copy link),
  **Report** (real).
- Post card: category tag, "Posted N hours ago", the text (first sentence as heading, rest as body;
  whole text always shown), "N Advice Threads" (real count).
- **Gentle Reminder** banner with "Got it, thanks", dismissal remembered in this browser.
- **Share Your Wisdom** reply box: avatar, text box, "Posting as Anon #NNNN · Character count: N",
  **Post Advice** (same safety check).
- **Advice Thread (N)**, "Sort by: Most Helpful" (the real order: upvotes, then newest). Each reply:
  avatar, anon name, an **OP** tag when the reply's author is the post's author (real), time, text,
  an upvote pill (one per browser, as today), **Report**.
- **Left out:** downvote, view count, "Verified Anonymous", nested replies and the Reply button,
  "Load More Discussions" (all replies are already shown).

### Not found (404 and empty search)

The "Lost in the Veil" page with the door image, **Return Home**, a search box, and Suggested
Pathways: **Community Feed**, **Ask for Advice**, and **Browse by Category** in place of the Privacy
Policy card (no such page). "Site Explorer" is omitted.

### Admin login `/admin/login`

The centred card: logo, "Administrator Sign In", **Secret Key** field with a show/hide eye, **Authorize
Access**. The "Trust this browser" option, the footer links and the "256-bit" pill are omitted. The
notice reads: "Failed sign-in attempts are recorded, and repeated failures lock the login." All
existing behaviour and messages are unchanged (lockout, fail-closed).

### Admin dashboard `/admin` (Platform Overview)

- "Welcome back, GistVeil Admin" with today's date (real). **History** and **Run Diagnosis** are
  omitted.
- **Four stat cards, real:** Total Anonymous Advice; Total Posts (in place of "Active Safe Spaces");
  Pending Reports; Failed sign-ins in the last 24 hours (in place of "Security Threats"). Each shows
  its real week-on-week change (last 7 days against the 7 before; "New" when the earlier week is 0).
- **Community Growth (last 7 days):** area = new posts and advice per day, teal bars = new anonymous
  users per day, red line = reports per day. All are counts per day on one axis, so there is no dual
  axis. It gets a legend, a hover/keyboard tooltip and a "View as table", per the dataviz rules, and
  its palette is re-validated for the light surface.
- **Urgent Reports:** the most-reported open items with a severity tag, "PENDING", and the time of the
  latest report; "Queue density: N items pending".

### Admin reports `/admin/reports` (Moderation Queue)

- Four cards, real: **Total Pending**, **Urgent (High)**, **New reports (24h)** and **Hidden items**
  (in place of "Avg response time" and "Resolved", which are not tracked).
- **Severity** is derived from the report count: 1 is Low, 2 is Medium, 3 or more is High.
- **Table:** ID (short reference such as `POST-8F3A1C`), a Reports column ("3 reports" plus the
  Post/Comment type, in place of "Reason"), content snippet, severity, reported at (time of the
  latest report), status ("pending"), and an eye button. The eye opens a detail panel with the full
  text and the existing actions: **Dismiss reports**, **Hide**, **Delete forever** (confirm),
  **Ban author** (reason, hide-content option).
- **Controls:** text filter, "All Reports" select (All / Posts / Replies), **Bulk Action** (hide or
  dismiss the ticked rows). A checkbox column is added, since bulk needs selection; the mockup does
  not draw one. "Advanced" is omitted. "Showing N of M reports", Previous / Next.

### Admin content `/admin/content` (Content Management)

- Cards, real: **Total Posts**, **Total Replies**, **Flagged Content** (open reports), **Recent
  Activity** (new in 24 hours).
- **Content Library:** tabs **All Content / Posts Only / Replies Only**, search, a Filters popover
  (category, status, reported only), **Export CSV**, **Bulk Actions** (hide, unhide, delete with
  confirm), pagination with page numbers.
- **Table:** ID, Type, Content Preview (with the category tag), Author (the real `Anon #NNNN`), Status
  (Active / Flagged / **Hidden**; Hidden is added because it is a real state), Timestamp, and a ⋮
  menu with Hide/Unhide, Pin/Unpin, Delete forever, Ban author.
- The mockup's invented author names ("Quiet Owl") are not used.

### Admin bans `/admin/bans` (Restricted Identities)

- Cards, real: **Total Banned IDs**, **Banned in the last 30 days**, **Posts and replies from banned
  IDs**, **Bans with a reason**.
- Table: Identity (anon name and the first characters of the token), Status ("Permanent": every ban
  is), Violation Reason (stored), Details (post and reply counts, in place of browser and region,
  which are not collected), Timeline ("Banned: date", "Indefinite duration"), and a ⋮ menu with
  **Unban**.
- **Left out:** the Permanent / Temporary / Appeals tabs (only "All Bans" exists), Add Identity Ban,
  Security Alerts, Ban Policy toggles, System Resources.

### Admin settings `/admin/settings` (Admin Control Room)

- Hero banner, then three tabs:
  - **Announcements:** Banner Title, Banner Message, Banner Theme (Info purple / Warning / Critical),
    **Active State** switch, a live **Preview**, **Reset Changes** and **Save Banner**.
  - **Content Filters:** the blocked-words editor.
  - **Data Management:** the four exports.
- **System Integrity** shows only real figures: database connection time (measured on load), open
  reports, blocked words. The mockup's uptime and "anonymity core" tiles are omitted.

## Data and backend changes

All additive, in `supabase/admin.sql` (still re-runnable), with the SQL harness extended.

| change | why |
|---|---|
| `settings` keys `announcement_title`, `announcement_theme`, `announcement_active`; anon SELECT policy widened to these keys plus `announcement` | banner title, theme, switch. An existing banner with no switch row counts as active. |
| `admin_content_list(...)`: posts and advice unified, filtered, paged, with a total count; service role only | the All Content tab, search and bulk lists |
| `admin_reports_list(...)`: open reports with the latest report time and total count; service role only | reports table |
| `admin_dashboard()`: 7-day series (content, users, reports), 7-vs-7 totals, failed sign-ins in 24h, urgent count; service role only | dashboard cards and chart |
| `popular_categories(p_days)`: visible posts per category; anon may execute | feed side card |

Search and load-more use ordinary PostgREST calls (`ilike`, `range`) under existing RLS. Bulk actions
call the existing per-item actions, capped at 100 ids per submit, and report partial failures.

## Copy changes

Layout is kept; wording is made true.

| mockup says | becomes |
|---|---|
| "Your browser fingerprint is anonymized automatically" | "You get a random name. We never ask for your name, email or phone number." |
| "Harmful content is removed instantly by moderators" | "Reported content is reviewed and removed by moderators." |
| "Encryption Active: scrubbed of metadata before being stored" | "Your post is sent over an encrypted (HTTPS) connection." |
| GistVeil Promise: "scrubbed of identifying metadata…" | "Your anonymity is our priority. Posting needs no account, and we never ask who you are." |
| "Verified Anonymous" | omitted |
| Login: "All access attempts are logged and monitored" | "Failed sign-in attempts are recorded, and repeated failures lock the login." |
| "View Crisis Resources" | links to `https://findahelpline.com`, a real directory of helplines |
| footer links to Privacy Policy, Terms, Safety Center, System Status, Contact Security | dropped (no such pages) |

## Verification

- **Visual QA loop.** For every screen, render at 1440px with realistic seeded data, place it next to
  its mockup, and iterate until structure, colour and measured spacing match. Also render at 390px
  and 768px. The local Postgres and PostgREST stack used for the admin is reused.
- **Unit tests** for new pure helpers: `splitPostText`, severity, week-on-week change, short ids,
  popular-category ordering, bulk id validation. The existing 80 tests stay green.
- **SQL harness** extended for the new functions and policies (grants, RLS, results).
- **Behaviour regression:** posting, replying, upvoting, reporting, all moderation actions, export and
  login are re-driven in a real browser after the restyle, as they were before it.
- The bundle scan for leaked secrets is repeated.

## Delivery

Branch `ui-redesign`, cut from `admin-panel` because the admin is restyled too and its pull request
is not merged yet. It is retargeted to `main` once that merges. One commit per step:

1. Foundations: assets moved, tokens, fonts, UI kit, both shells.
2. Public: feed with search and load-more, New Post, post page, not-found.
3. Admin: login, dashboard, reports, content, bans, settings, plus the SQL.
4. Full QA pass, the docs (`docs/project-guide.md`, `docs/admin-setup.md`) updated to match.

## Follow-on: messaging between visitors and the admin

Requested by the owner, not part of this work. Notes for its own spec:

- Visitors have no accounts, so a conversation is tied to a secret kept in the visitor's browser.
  It must **not** reuse the device token, which the public API can currently read; a private inbox
  cannot rest on it.
- Clearing browser data loses access to the thread, the same accepted limit as identity.
- Replies are seen when the visitor next opens the site (there is no email or push); a badge in the
  sidebar can show a new reply.
- It needs spam controls (per-thread and per-visitor limits), an admin inbox with unread counts, and
  a visitor-side page, all in this visual system.
