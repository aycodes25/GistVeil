# GistVeil UI Redesign Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (inline). This plan fixes task
> boundaries, exact interfaces and verification; code is written directly into the named files.
> Source of truth: `docs/superpowers/specs/2026-09-19-ui-redesign-design.md`. The visual
> references are the ten PNGs in `design/reference/` (`visily-<screen>.png`, 1488 px wide; the
> screen itself starts at x=24, y=24 and is 1440 px wide).

**Goal:** Restyle every public and admin page to the Visily mockups, keep all behaviour, and add
search, load-more, banner themes, an All Content tab and bulk actions.

**Architecture:** Tokens in the Tailwind theme, a small UI kit (`components/ui`), two shells
(`PublicShell`, `AdminShell`) that pages wrap themselves (top-bar crumbs and title vary per page),
and pages composed from them. New admin data comes from service-role-only SQL functions.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19, Tailwind 4, supabase-js, `next/font`,
`next/image`, `node:test`, Playwright (visual QA), PGlite (SQL harness).

## Global Constraints

- Real data only: no invented statistics; omit what has no backing (spec, "Screens").
- Light theme only (`color-scheme: light`); no `dark:` variants.
- Every colour comes from a theme token; no hex literals in components.
- Behaviour is unchanged: posting (empty/category/safety checks, messages), replying, upvote and
  report (one per browser), all moderation actions, export, login lockout and fail-closed.
- Admin rules stay: every page and action authenticates; `server-only` on privileged modules; pure
  modules never import `server-only`.
- Responsive: >= 1024 px sidebar visible; below, a slide-over menu; admin tables scroll inside
  their card. No horizontal page scroll at 390 px.
- Next 16 conventions (async `cookies`, `params`, `searchParams`; `proxy.ts`; error boundary prop
  `retry`). Read `node_modules/next/dist/docs/` for any API used for the first time.
- Work on `ui-redesign`; commit per task; do not push unless asked.
- Verification for every task: `npx tsc --noEmit`, `npm test` (80 existing + new stay green), lint
  clean on touched files, then a browser check against the matching mockup.

## Verification environment (set up once, reused)

The local Postgres 18 + PostgREST stack from the admin work lives in the session scratchpad
(`stack.mjs` starts it, UTF-8, applies `schema.sql`, `seed.sql`, `admin.sql`; `env.sh` points the app
at it with throwaway admin credentials; `more-data.mjs`, `backfill.mjs`, `export-data.mjs` add
realistic rows). Run the app as `next build` + `next start -p 3100`. Screenshots at 1440 px are
composed next to the mockup (mockup crop on the left) and reviewed.

## File Structure

```
design/reference/visily-*.png          the ten mockups (committed)
design/brand-explorations/             generated images (gitignored)
public/images/                         logo, hero, door, people (used assets only)
app/globals.css                        theme tokens, base
app/layout.tsx                         fonts, html/body
app/(site)/page.tsx                    feed            (moved from app/page.tsx)
app/(site)/post/new/page.tsx           new post        (moved)
app/(site)/post/[id]/page.tsx          post page       (moved)
app/not-found.tsx                      404 inside PublicShell
lib/present.ts (+test)                 pure presentation helpers
components/ui/*                        kit: Button, Card, Badge, Tabs, Avatar, Toggle, StatCard,
                                       SearchInput, Select, DataTable, RowMenu, EmptyState,
                                       Breadcrumbs, Logo
components/shell/*                     PublicShell, AdminShell, Sidebar, TopBar, MobileMenu, UserChip
components/site/*                      Hero, CategoryFilter, PostCard, FeedList, SidePanels,
                                       AnnouncementBanner, NotFoundPanel, PostForm, Thread pieces
components/admin/*                     restyled + new admin pieces
supabase/admin.sql                     + new functions and policy (re-runnable)
supabase/tests/verify-admin-sql.mjs    + checks for them
```

---

### Task 1: Assets and repository hygiene

**Files:** move `public/visily-multiscreens (2)/*` -> `design/reference/`; move `public/Screenshot…png`
and the six `magnific_…png` -> `design/brand-explorations/` (add to `.gitignore`); move the four used
images to `public/images/{logo,hero,door,people}.png`; stage the five deleted starter SVGs.

- [ ] Move files; `.gitignore` gains `/design/brand-explorations/`.
- [ ] `public/` now contains only `favicon`-level files and `images/` (about 1.2 MB).
- [ ] Commit: `chore: organise design assets; serve only the images the site uses`

### Task 2: Tokens, fonts, light theme

**Files:** `app/globals.css`, `app/layout.tsx`.

- [ ] Identify the fonts: render candidates (Outfit, Inter, Plus Jakarta Sans, Manrope) at the
      mockup's heading/body sizes and compare with mockup crops. Pick and load with `next/font`.
- [ ] Sample and record token values per element (page, sidebar, primary, chip, promise, pill, ink,
      muted, teal, danger, borders, shadows, radii) into the `@theme` block.
- [ ] `color-scheme: light`; remove the dark scheme and the dark `viz-root` tokens.
- [ ] Commit: `feat(ui): design tokens, fonts, light theme`

### Task 3: Presentation helpers (pure, TDD)

**Files:** `lib/present.ts`, `lib/present.test.ts`.

```ts
splitPostText(text: string): { title: string; excerpt: string }   // first sentence = title
severityFor(reportCount: number): 'low' | 'medium' | 'high'        // 1 low, 2 medium, >=3 high
weekDelta(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'flat' | 'new' }
shortRef(type: 'post' | 'advice', id: string): string             // POST-8F3A1C / REPLY-8F3A1C
avatarTone(seed: string): number                                   // 0..5, stable per seed
longDate(d: Date): string                                          // "September 19, 2026"
```

Tests: first-sentence split on `. ? !` and newlines; no terminator; long first sentence (> 110
characters) is cut at a word boundary with an ellipsis and the remainder becomes the excerpt;
whitespace trimmed; nothing lost (title + excerpt reproduces the text, apart from the ellipsis).
Severity boundaries 0/1/2/3/9. `weekDelta(120,100)` -> "+20%" up; (80,100) -> "-20%" down; (5,0) ->
"New"; (0,0) -> flat. `shortRef` uppercases the first 6 hex characters. `avatarTone` deterministic and
in range.
- [ ] Red, implement, green. Commit: `feat(ui): presentation helpers`

### Task 4: UI kit

**Files:** `components/ui/*`.

Presentational, server-safe unless noted. Each takes className overrides and uses tokens only.
`Button` (primary / secondary / ghost / danger, sizes, `asChild`-style link variant), `Card`,
`Badge` (tones: neutral, primary, success, warning, danger), `Tabs` (link-based pill tabs; active
purple), `Avatar` (generated: tone from `avatarTone`, hooded silhouette), `Toggle` (client),
`StatCard` (label, value, delta, icon chip), `SearchInput` (a GET form), `Select`, `DataTable`
(header, rows, sticky header, horizontal scroll wrapper), `RowMenu` (client, keyboard accessible),
`EmptyState`, `Breadcrumbs`, `Logo`.
- [ ] Build; type-check; commit: `feat(ui): shared UI kit`

### Task 5: Shells

**Files:** `components/shell/*`, route moves into `app/(site)/`.

**Interfaces — Produces:**
```tsx
<PublicShell crumbs={[{label, href?}]} title="Discover Advice">{children}</PublicShell>
<AdminShell  crumbs={[...]} title="Platform Overview">{children}</AdminShell>
```
Sidebar (client): logo; COMMUNITY (Home Feed, New Post); admin adds ADMIN CONTROL (Dashboard,
Reports, Content, Bans, Settings) and Sign Out (form action `logout`). `UserChip` (client) reads the
existing identity from localStorage (`gistveil_identity`), shows `Anon #NNNN` or "Anonymous", never
creates an identity. `MobileMenu` (client) is the slide-over below 1024 px. The top bar has
breadcrumbs, title, the search form (`/` with `q`) on public pages, the user chip.
- [ ] Move `app/page.tsx` and `app/post/**` under `app/(site)/`; wrap the three pages (content
      unchanged for now) in `PublicShell`; wrap admin panel pages via `AdminShell`.
- [ ] Verify all existing flows still work in the browser. Commit: `feat(ui): public and admin shells`

### Task 6: Database additions

**Files:** `supabase/admin.sql`, `supabase/tests/verify-admin-sql.mjs`.

- `settings`: anon SELECT policy allows keys `announcement`, `announcement_title`,
  `announcement_theme`, `announcement_active`.
- `admin_content_list(p_kind text, p_q text, p_category text, p_status text, p_reported boolean, p_limit int, p_offset int)`
  -> unified rows `(type, id, post_id, body, category, author_id, author_name, report_count, hidden,
  pinned_at, upvotes, created_at, total_count)`; `p_kind` all|posts|advices; `p_status`
  all|visible|hidden|flagged; `p_q` matches body or author name (caller passes an escaped pattern).
- `admin_reports_list(p_type text, p_q text, p_limit int, p_offset int)` -> open (reported, not
  hidden) items with `latest_report_at` and `total_count`, most-reported first.
- `admin_dashboard()` -> jsonb: totals (posts, advices, anon_users, open_reports, urgent_reports
  (>= 3), hidden_items, banned), `week` current-vs-previous 7-day counts (posts, advices, new
  reports), `failed_signins_24h`, `daily` for 7 days (content = posts + advices, users, reports).
- `popular_categories(p_days int)` -> `(category, n)` for visible posts, executable by anon.
- All `admin_*` functions: EXECUTE revoked from public/anon/authenticated, granted to service_role.
- [ ] Harness checks: grants (anon denied on admin functions; allowed on `popular_categories`), the
      widened settings policy (anon sees the four keys, nothing else), results match table counts,
      severity boundary counting, paging and `total_count`, search by author, `all/flagged` filters.
- [ ] Apply to the local stack; commit: `feat(admin): SQL for dashboard, reports, content, banner and popular categories`

### Task 7: Feed

**Files:** `app/(site)/page.tsx`, `components/site/{Hero,CategoryFilter,PostCard,FeedList,SidePanels,AnnouncementBanner,NotFoundPanel}.tsx`.

- Server page reads `category`, `q`; first 30 posts (pinned first, then newest; the existing 42703
  fallback stays); announcement via the four settings keys (active + non-empty; theme Info / Warning /
  Critical; a lone legacy `announcement` row counts as active Info); popular categories via the RPC
  (errors ignored).
- `FeedList` (client) holds posts and fetches the next 30 with the anon client on "View More Posts".
- Search: `ilike` on `body` with `escapeLike`-equivalent for the public side (LIKE metacharacters
  matched literally). Zero results with `q` renders `NotFoundPanel` (search prefilled, Return Home,
  Load more posts) above the latest posts.
- Cards use `splitPostText`; Pinned tag; reply count; share (Web Share API, else clipboard).
- [ ] Browser check vs `visily-home-feed.png` at 1440 and 390; commit: `feat(ui): feed`

### Task 8: New Post

**Files:** `app/(site)/post/new/page.tsx`, `components/site/PostForm.tsx`.
- [ ] Layout, panels and truthful copy per spec; existing validation, safety filter (with blocked
      words), messages, and redirect unchanged; counter counts characters, no limit. Check vs
      `visily-new-post.png`; commit: `feat(ui): new post`

### Task 9: Post page and not-found

**Files:** `app/(site)/post/[id]/page.tsx`, `components/site/{Thread,AdviceItem,ReplyBox,ReminderBanner}.tsx`, `app/not-found.tsx`.
- [ ] Post page per spec (OP tag from `anon_user_id`, reminder dismissal in localStorage, upvote pill,
      Report, Share, Advice Thread). Not-found page per spec inside `PublicShell`. Check vs
      `visily-post-detail.png` and `visily-404-page.png`; commit: `feat(ui): post page and not found`

### Task 10: Admin login

**Files:** `app/admin/login/{page,LoginForm}.tsx`.
- [ ] Centred card, Secret Key with show/hide, true notice; behaviour unchanged. Check vs
      `visily-admin-login.png`; commit: `feat(ui): admin login`

### Task 11: Admin dashboard

Invoke the `dataviz` skill first. **Files:** `app/admin/(panel)/page.tsx`, `lib/admin/queries.ts`
(`fetchDashboard`), `components/admin/{GrowthChart,UrgentReports}.tsx`, `lib/admin/types.ts`.
- [ ] Four real stat cards with `weekDelta`, Community Growth (area + bars + line, one axis, legend,
      tooltip, keyboard, table view; palette validated for the light surface), Urgent Reports. Check
      vs `visily-admin-dashboard.png`; commit: `feat(ui): admin dashboard`

### Task 12: Admin reports

**Files:** `app/admin/(panel)/reports/page.tsx`, `components/admin/{ReportsTable,ReportDetail}.tsx`,
`app/admin/actions/moderation.ts` (bulk).
- [ ] Table, severity, detail panel with the existing four actions, filters, pagination, bulk
      Dismiss/Hide (ids validated, max 100, partial failures reported). Check vs
      `visily-admin-reports.png`; commit: `feat(ui): admin reports with bulk actions`

### Task 13: Admin content

**Files:** `app/admin/(panel)/content/page.tsx`, `components/admin/ContentTable.tsx`, `queries.ts`, bulk actions.
- [ ] All / Posts / Replies tabs on `admin_content_list`, search, Filters popover, Export CSV, bulk
      Hide/Unhide/Delete (confirm), row menu with the existing actions, page numbers. Check vs
      `visily-admin-content.png`; commit: `feat(ui): admin content with All Content tab`

### Task 14: Admin bans

**Files:** `app/admin/(panel)/bans/page.tsx`, `components/admin/BansTable.tsx`.
- [ ] Four real cards, table, Unban in the row menu. Check vs `visily-admin-bans.png`; commit:
      `feat(ui): admin bans`

### Task 15: Admin settings

**Files:** `app/admin/(panel)/settings/page.tsx`, `components/admin/{SettingsTabs,BannerEditor}.tsx`,
`app/admin/actions/settings.ts`, `lib/admin/validate.ts` (+test for banner fields).
- [ ] Announcements tab (title <= 60, message <= 280, theme, Active switch, live preview, Reset, Save),
      Content Filters (blocked words), Data Management (exports), real System Integrity tiles
      (database connection time measured on load, open reports, blocked words). Check vs
      `visily-admin-settings.png`; commit: `feat(ui): admin settings with banner themes`

### Task 16: Full QA, docs, handoff

- [ ] Every screen at 1440, 768 and 390 px, side by side with its mockup; fix differences.
- [ ] Behaviour regression driven in a real browser: post (incl. blocked and safety cases), reply,
      upvote, report, search hit and miss, load more, every moderation action, bulk actions, export,
      banner on/off/theme, login lockout, bans.
- [ ] `tsc`, `npm test`, `npm run build`, SQL harness, secret scan of `.next/static`, admin audit script.
- [ ] Update `docs/project-guide.md` and `docs/admin-setup.md`; sync the spec with anything that changed.
- [ ] Commit: `docs: sync guide and setup to the redesign`

---

## Self-review against the spec

- Coverage: assets (T1), tokens/fonts/light (T2), helpers (T3), kit (T4), shells and user chip (T5),
  SQL (T6), feed with search/load-more/popular/banner (T7), New Post (T8), post page and 404 (T9),
  login (T10), dashboard (T11), reports with bulk (T12), content with All tab and bulk (T13), bans
  (T14), settings with banner themes (T15), QA and docs (T16).
- Interfaces are defined once (T3 helpers, T5 shells, T6 SQL) and reused by name.
- Deferred by decision: messaging sub-project, safety checkbox / character limit, "Trust this browser".
