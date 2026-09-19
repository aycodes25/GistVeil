# GistVeil: Project Guide

GistVeil is a website where people post a personal problem **anonymously** and get advice from other anonymous people. There are no accounts, no emails and no phone numbers. Someone opens the site and can start reading, searching, posting or replying straight away.

Live site: <https://gist-veil.vercel.app>

This guide explains what the project is, how it works, and what every page and tab does. It covers the public site first, then the private admin area the site owner uses to keep things safe.

## Contents

1. [What GistVeil is](#1-what-gistveil-is)
2. [The life of a post](#2-the-life-of-a-post)
3. [How anonymity works](#3-how-anonymity-works)
4. [Every page at a glance](#4-every-page-at-a-glance)
5. [The public site, page by page](#5-the-public-site-page-by-page)
6. [The admin area, page by page](#6-the-admin-area-page-by-page)
7. [What each moderation action means](#7-what-each-moderation-action-means)
8. [Under the hood](#8-under-the-hood)
9. [Limits worth knowing](#9-limits-worth-knowing)
10. [More documentation](#10-more-documentation)

## 1. What GistVeil is

Anyone can write down a problem (a relationship that keeps going wrong, money worries, a difficult boss) under a random name like **Anon #1247**, pick a category, and publish it. Other visitors reply with advice. Helpful replies can be **upvoted**, so the best advice rises to the top of each thread. Anything harmful can be **reported**, and the site owner reviews reports and removes what shouldn't be there.

**What it does**

- Post a problem, in one of six categories.
- Browse posts by category, search them, and load more as you scroll down.
- Reply with advice, upvote replies, share a post, report posts and replies.
- Block phone numbers and offensive language before anything is published.
- Give the owner a private admin area to moderate (one item at a time or in bulk), ban abusers, watch activity, and manage a site-wide banner and blocked words.

**What it deliberately does not do yet**

Voice notes, AI rewriting of posts, text-to-image cards, push notifications, ads and paid features, a therapist marketplace, and messaging between visitors and the owner. The plan is to prove that people actually post and reply first. The ideas for later are in [`monetization-ideas.md`](monetization-ideas.md).

The idea started with students and school communities (the phone-number check recognises Nigerian and international formats), but nothing in the product is limited to them.

## 2. The life of a post

1. **A visitor writes a post** and picks a category. The site checks it for phone numbers and offensive language before saving.
2. **It appears at the top of the feed** (newest first) under the visitor's random name.
3. **Other visitors open it and reply.** Each reply can be upvoted by anyone, once per browser.
4. **Anyone can report** a post or a reply they think is harmful.
5. **The owner reviews reports** in the admin area and decides: dismiss the report, hide the item, delete it forever, or ban the author.

## 3. How anonymity works

There is no login. The first time a browser posts, votes or reports, the site creates an identity for it:

- a random display name such as **Anon #6400**, shown next to everything that browser writes;
- a random secret token, kept in that browser's storage. The site never displays it.

Three things follow from this:

- Names are random and **not unique**. Two different people can end up with the same number.
- The same browser keeps the same identity between visits, so its posts share a name.
- Someone who clears their browser's site data (or uses a private window) gets a **brand-new identity**. This is why bans and the one-upvote-per-browser rule are a speed bump, not a wall (see [section 9](#9-limits-worth-knowing)).

## 4. Every page at a glance

| Address | Who can open it | What it is |
|---|---|---|
| `/` | everyone | The feed: banner, hero, category tabs, search, posts |
| `/?category=money`, `/?q=raise` | everyone | The same page, narrowed by a category and/or a search |
| `/post/new` | everyone | Write a new post |
| `/post/<id>` | everyone | One post with its advice, plus the reply form |
| any unknown address | everyone | "Lost in the Veil": the 404 page |
| `/admin/login` | the owner | Admin sign-in |
| `/admin` | the owner | Dashboard (numbers, chart, urgent reports) |
| `/admin/reports` | the owner | The moderation queue |
| `/admin/content` | the owner | Every post and reply, with search, filters and bulk actions |
| `/admin/bans` | the owner | Banned identities |
| `/admin/settings` | the owner | Banner, blocked words, data export, system figures |
| `/admin/export` | the owner | Not a page: the download behind the export buttons |

The admin is **not linked from the public site**. The owner opens `/admin` directly (for example `https://gist-veil.vercel.app/admin`) and signs in with a password.

## 5. The public site, page by page

Every public page shares the same frame:

- **Left sidebar** with the GistVeil logo, **Home Feed** and **New Post**. Below 1024px wide it becomes a slide-over menu opened from the button at the top left.
- **Top bar** with breadcrumbs, the page title, a **Search content...** box (it searches the feed), and the visitor's own random name (or "Anonymous" until their browser has an identity).
- **Footer** with the copyright line.

### 5.1 Home: the feed (`/`)

The page is titled **Discover Advice**. From top to bottom:

- **Announcement banner** (only when the owner has switched one on). A coloured note at the very top, with an optional bold title, for messages such as "Maintenance tonight at 10pm". Its colour is chosen by the owner: purple (Info), amber (Warning) or red (Critical).
- **Hero.** "A Safe Space for Unfiltered Advice", with **Share Your Story** (opens the new-post page) and **Browse Anonymously** (scrolls down to the posts).
- **Filter card** overlapping the hero: the category tabs (see 5.2) and a **Search posts...** box (see 5.3).
- **The posts.** A pill such as "Showing 30 of 48 results", "Sort by: Recent", then the cards in two columns (one column on a phone). Each card shows:
  - a generated avatar, the category badge, and how long ago it was posted ("just now", "5m ago", "3h ago", "2d ago");
  - a **title** (the post's first sentence) and up to three lines of the rest of the text;
  - the number of replies, a **share** button, and **Read More**.
  - Posts the owner has pinned show a **Pinned** label and sit at the top; everything else is newest first.
- **View More Posts.** The feed loads 30 posts at a time. This button loads the next 30 and disappears when there are no more.
- **Side panels** (on wide screens, to the right; below the posts on narrow ones): **Trending Topics** (the categories with the most posts in the last seven days, each linking to its tab, and left out entirely if it can't be loaded), the **GistVeil Promise**, and **Community Norms**.

If a category has no posts it says "No posts in Money yet." with a **Share Your Story** button. If the posts can't be loaded, it says "Couldn't load the feed. Try refreshing."

Clicking a card opens that post's page. The share button copies the post's link (on a phone it opens the phone's share sheet instead).

### 5.2 The category tabs

A row of rounded tabs in the filter card. The current tab is highlighted; on a phone the row scrolls sideways. Each tab reloads the feed showing only that category (the address becomes `/?category=money`, and so on), and the **All** tab clears the filter. A search you have typed is kept when you switch tabs.

| Tab | What people post there |
|---|---|
| **All** | Every category, mixed |
| **Relationship** | Partners, exes, arguments that never end, getting over someone |
| **Money** | No savings, where to start, a friend who owes money |
| **Family** | Setting boundaries, family expectations, telling your parents things |
| **Work/Career** | Feeling stuck, quitting, a manager who takes credit |
| **Mental Health** | Low days, not wanting to get out of bed, whether to see someone |
| **Education** | Failed courses, exams, telling parents about results |

The categories are fixed. Visitors and the owner can't add new ones.

### 5.3 Searching

Either search box (the top bar's or the filter card's) opens `/?q=your words`. A post matches when its text contains what you typed, ignoring capitals. Symbols such as `%` and `_` are matched literally. The search keeps the active category, so **Money + "raise"** finds money posts that mention "raise". Searches are limited to 100 characters.

**When nothing matches** the page shows **Lost in the Veil** (the same panel as the 404 page, headed "No results") with a search box, a **Return Home** button and a **Load more posts** button, and the latest posts remain below it, so there is never a dead end.

### 5.4 New post (`/post/new`)

The page is titled **Compose Advice Request**. A form with:

- a **Category** drop-down ("Pick a category");
- **The Situation**, a large text box, with a hint ("Min. 50 characters for better responses.") and a live character count. The 50 characters is advice only; nothing enforces it, and there is no upper limit;
- **Cancel and Discard**, which returns to the feed, and a purple **Post Anonymously** button.

Beside and below the form are guidance panels: **Your Privacy Matters** (what not to include), a **Quality Checklist**, **Need immediate support?** (a link to a directory of crisis helplines), and two notes, **What happens next?** and **Encryption Active** (the connection is HTTPS).

What happens when you press **Post Anonymously**, in order:

1. Empty text → "Write something before posting."
2. No category chosen → "Pick a category."
3. The [safety check](#58-the-safety-check) runs. If it finds a problem, the message says what to remove and nothing is saved.
4. The post is saved and you are taken straight to its page.
5. If saving fails (no connection, or the browser has been banned), you see the same friendly message either way: "Couldn't post right now. Try again."

Nothing is auto-edited: the site tells you what to fix and leaves your text alone.

### 5.5 A post's page (`/post/<id>`)

The page is titled **Viewing Advice Request**, with breadcrumbs *Home Feed › category › Post Detail*.

- **Back to community feed**, plus **Share** and **Report** buttons for the post.
- **The post card:** category badge, "Posted 2 hours ago", the title (the first sentence) and the rest of the text beside a generated avatar, and a count of advice threads.
- **Gentle Reminder.** A soft note asking for empathetic, constructive replies. **Got it, thanks.** hides it, and this browser remembers.
- **Share Your Wisdom:** the reply form. A text box ("Type your thoughtful advice here..."), a line "Posting as Anon #N • Character count: N", and a **Post Advice** button. It runs the same safety check as posting; after a successful reply the box empties and the new reply appears.
- **Advice Thread (N):** the replies, most upvoted first, then newest ("Sort by: Most Helpful"). Each shows the avatar, the author's name, an **OP** badge when the author is the person who wrote the post, the time, the text, an upvote button and a **Report** link. When there are no replies it says so.

If the post doesn't exist (or the owner has hidden it) you see the 404 page.

### 5.6 The two small buttons: upvote and report

**Upvote (▲ 3).** Appears on every reply. Click it once to add your vote; the number goes up and the button turns purple. Each browser can upvote a given reply only once, and the button stays purple and disabled afterwards.

**Report.** Appears on every post and every reply. Click it to flag the item to the owner; the label changes to **Reported** and can't be clicked again in that browser. Reporting doesn't remove anything by itself. It puts the item in the owner's review queue.

### 5.7 The 404 page ("Lost in the Veil")

Any address that doesn't exist, a deleted post, or a hidden one shows **Lost in the Veil** ("Error 404"): an illustration, a short explanation, **Return Home**, a search box, and three **Suggested Pathways** (Community Feed, Ask for Advice, Browse by Category). The response really is a 404, and search engines are told not to index it.

### 5.8 The safety check

Before a post or a reply is saved, the site looks for two things:

| Problem | What you see |
|---|---|
| **Phone numbers**, meaning seven or more digits in a row (spaces, dashes and a leading + are allowed) | "Please remove phone numbers from your post." |
| **Offensive language**, from a short built-in list plus any words the owner adds | "Please remove offensive language from your post." |

It is deliberately blunt, to protect people from sharing contact details and from harassment. Words are matched **inside** longer words too, so an occasional harmless sentence can be blocked, and that trade-off is accepted. The check runs in the visitor's browser.

## 6. The admin area, page by page

The admin is a private control room for the site owner. Everything in it is protected by one password.

### 6.0 Getting in

1. Open `/admin` on the site. If you aren't signed in you are sent to the **Administrator Sign In** page.
2. Enter the password in the **Secret Key** box (the eye button shows or hides what you typed) and press **Authorize Access**.

Messages you might see:

| Message | Meaning |
|---|---|
| "Incorrect password." | The password was wrong. |
| "Too many attempts. Try again later." | Five wrong tries from the same place within 15 minutes; wait and try again. |
| "Couldn't sign in right now. Try again later." | The admin isn't fully set up, or the database can't be reached. See [`admin-setup.md`](admin-setup.md). |

A sign-in lasts 12 hours. The admin is also designed to refuse everyone if any of its required secrets is missing.

### 6.1 The frame around every admin page

- **Sidebar.** The logo, then **Community** (Home Feed, New Post) and **Admin Control** (Dashboard, Reports, Content, Bans, Settings). The current page is highlighted. **Sign Out** sits at the bottom and ends your session immediately. Below 1024px wide the sidebar becomes a slide-over menu from the button at the top left.
- **Top bar.** Breadcrumbs, the page title, a **Search content...** box (it opens the Content page filtered to what you typed), and the word "Administrator".

| Sidebar link | Takes you to |
|---|---|
| **Dashboard** | The numbers, chart and urgent reports |
| **Reports** | The moderation queue |
| **Content** | Everything ever posted |
| **Bans** | Banned identities |
| **Settings** | Banner, blocked words, downloads |

### 6.2 Dashboard (`/admin`)

Titled **Platform Overview**, with "Welcome back, GistVeil Admin" and today's date. Every figure is counted from real data.

**Four number cards:**

| Card | Shows | The small change figure |
|---|---|---|
| **Total Anonymous Advice** | All replies ever posted | New replies in the last 7 days compared with the 7 days before |
| **Total Posts** | All posts ever made | The same comparison for posts |
| **Pending Reports** | Reported items still waiting for review | The same comparison for new reports (fewer is better, so a fall is shown in green) |
| **Failed sign-ins** | Wrong-password attempts in the last 24 hours | "in the last 24 hours" |

The change figure reads "New" when there was nothing to compare against last week.

**Community Growth.** A chart of the last 7 days: **New content** (posts and replies, the purple area), **New users** (teal bars) and **Reports** (a red line). The legend shows each series' 7-day total. Move the mouse over the chart, or tab onto it and use the arrow keys, to see one day's exact numbers. **View as table** underneath lists every day as a table.

**Urgent Reports.** "Queue density: N items pending", then the five most-reported open items, each with a **Low**, **Medium** or **High** badge, its ID, a two-line preview, its report count and when it was last reported. Clicking one opens the Reports page. See 6.3 for how severity is worked out.

**Posts by category.** Horizontal bars showing how many posts each category has, largest first. It counts hidden posts too.

### 6.3 Reports (`/admin/reports`)

Titled **Moderation Queue**. Four cards: **Total Pending** (open reports), **Urgent (High)** (3 or more reports), **New reports (24h)** and **Hidden items**.

A report only records that someone flagged an item; it has no reason or category of its own. So **severity is derived from how many people reported the item**: 1 report is **Low**, 2 is **Medium**, 3 or more is **High**.

Above the list, a **Filter reports...** box (text or author name), a type drop-down (**All Reports**, **Posts**, **Replies**) and a **Filter** button. The list shows 25 to a page, most-reported first (then the most recently reported), with "Showing 1–25 of 61 reports" and page links underneath. When nothing is waiting it says so.

The columns are **ID** (such as `POST-8F3A1C` or `REPLY-2B90D4`), **Reports**, **Content**, **Severity**, **Reported** (how long ago the latest report came in), **Status** and an eye button. Click the eye to open the item in place: the full text, its author and category, and four actions:

| Button | What it does |
|---|---|
| **Dismiss reports** | Decides the item is fine: clears its reports and leaves it visible. |
| **Hide** | Takes it off the public site, but keeps it so you can bring it back. |
| **Delete forever** | Removes it permanently. The first click turns the button into **Confirm delete**; click again to go ahead. |
| **Ban author** | Opens a small panel: a tick-box **Also hide all their content** (on by default), an optional reason, and **Confirm ban** / **Cancel**. |

**Bulk actions.** Tick the boxes on the left of any rows (the box in the header ticks the whole page). A bar appears with "N selected", **Dismiss reports** and **Hide**, and afterwards a message such as "Dismissed reports on 2 items." Up to 100 items at a time. Deleting and banning are done one item at a time from here (the Content page can also delete in bulk).

Full definitions are in [section 7](#7-what-each-moderation-action-means).

### 6.4 Content (`/admin/content`)

Titled **Content Management**. Every post and reply, not just the reported ones. Four cards: **Total Posts**, **Total Replies**, **Flagged Content** (open reports) and **Recent Activity** (new in the last 24 hours).

**The Content Library** has three tabs: **All Content**, **Posts Only** and **Replies Only**. Switching tabs keeps your search and filters.

**Search and filters:**

| Control | What it does |
|---|---|
| **Search content or author...** | Finds items whose text contains what you type, or whose author name matches. Symbols such as `%`, `_` and `\` are matched literally. |
| **Filters** (a pop-over; it says "(on)" when active) | **Category** (posts only), **Status** (All, Visible, Flagged (reported), Hidden) and **Reported only**, with **Apply** and **Reset**. |
| **Export CSV** | Downloads **Posts (CSV)** or **Replies (CSV)**. |

The columns are **ID**, **Type**, **Content preview**, **Author**, **Status** (**Active**, **Flagged** or **Hidden**, plus a **Pinned** badge) and **Timestamp**. Results come 25 to a page, with page numbers and "Showing 1–25 of 78 items". If you delete the last item on the last page, the page moves you back to the last page that still exists.

**The ⋮ menu on each row:**

| Item | Notes |
|---|---|
| **View post** / **View thread** | Opens the public page in a new tab. |
| **Hide** / **Unhide** | Toggles whether the public can see it. |
| **Pin to top of feed** / **Unpin** | Posts only. Pinned posts appear first in the public feed with a **Pinned** label. |
| **Delete forever** | Asks for a second click to confirm. |
| **Ban author…** | Same panel as in Reports. |

**Bulk actions.** Tick rows (or the header box for the whole page); a bar shows "N selected" with **Hide**, **Unhide** and **Delete forever**. Delete needs a second click (**Confirm delete N**). Up to 100 items at a time, and the message afterwards says what was done ("Hid 2 items.").

### 6.5 Bans (`/admin/bans`)

Titled **Restricted Identities**. Four cards: **Total Banned IDs**, **Banned in the last 30 days**, **Posts and replies from banned IDs** and **Bans with a reason**.

Below, **All Bans**, newest first. Each row shows the author's random name and the first eight characters of their secret token (just enough to tell entries apart), a **Permanent** badge, the reason you gave ("No reason recorded" if none), how many posts and replies they have, when they were banned ("Indefinite duration": every ban is permanent until you unban), and an **Unban** button. When the list is empty it says "No banned identities."

- A ban stops that browser identity from **posting or replying**. The banned visitor isn't told; they just see the ordinary "Couldn't post right now. Try again."
- **Unbanning does not unhide their content.** Do that from the Content page.
- A note on the page reminds you that clearing site data gives someone a fresh identity, so a ban is a speed bump rather than a wall.

### 6.6 Settings (`/admin/settings`)

Titled **System Settings**, with an **Admin Control Room** header. Three tabs, then a **System Integrity** strip that shows on every tab.

**Announcements.** The site-wide banner. The form has:

- **Active State**, a switch. Off keeps the banner saved but hides it from visitors.
- **Banner Title** (optional, up to 80 characters).
- **Banner Message**, with a counter out of 280 characters.
- **Banner Theme**: **Info (Primary Purple)**, **Warning (Amber)** or **Critical (Red)**.
- **Preview (Live Mockup)**: shows exactly what visitors will see, as you type.
- **Reset Changes** (discards edits and goes back to what is saved) and **Save Banner**.

After saving you see "Banner saved and live." (or "Banner saved (switched off)."). To remove the banner completely, empty the message and save: "Banner removed."

**Content Filters.** Words or phrases that posts and replies may not contain, in addition to the built-in list.

- Type or paste words into **Add words or phrases**, separated by commas or new lines, then press **Add to blocklist**. Entries are trimmed, lower-cased and de-duplicated ("Saved 3 words."). Each can be up to 60 characters.
- The current words appear below as small pills. Click the **×** on a pill to remove it.
- Matching is by substring and ignores capitals, so a short word can catch harmless text too.
- Everything on this list can be read by anyone technical enough to look, because the check runs in the visitor's browser.

**Data Management.** Four download buttons: **Posts (JSON)**, **Posts (CSV)**, **Advice (JSON)**, **Advice (CSV)**. See 6.7.

**System Integrity.** Four live figures, measured when the page loads: **Database connection** (how many milliseconds the database took to answer, labelled Excellent, Good or Slow), **Open reports**, **Blocked words** and **Banned identities**.

### 6.7 The export download (`/admin/export`)

This isn't a page you look at. It is what the export buttons download.

- Includes **every** post or reply, hidden ones too, with report counts, the author's random name and each item's identifiers.
- **Never includes device tokens.**
- The file is named like `gistveil-posts-2026-09-19.csv`.
- **CSV** files open in Excel or Google Sheets with accents and emoji intact. Text that starts with `=`, `+`, `-` or `@` gets an apostrophe added in front, so a spreadsheet can't mistake a post for a formula.
- **JSON** files are for developers and other software.
- It only works while you are signed in; otherwise it answers "401".

### 6.8 Sessions

Signing in lasts 12 hours. Signing out ends it at once. If the site owner ever needs to sign everyone out, changing the session secret in the hosting settings does it.

## 7. What each moderation action means

| Action | Visible to the public? | Reversible? | What it does |
|---|---|---|---|
| **Dismiss reports** | Stays visible | n/a | Resets the report count to 0 and clears the report records. Nothing else about the item changes. |
| **Hide** | **No** | **Yes** (Unhide) | The item vanishes from the feed and its page. Hiding a post hides its whole thread, replies included. |
| **Delete forever** | **No** | **No** | Removes the item for good, together with its replies, votes and reports. |
| **Ban author** | Not by itself | Yes (Unban) | Blocks that browser identity from posting and replying. The optional tick-box also hides everything they have written. |
| **Pin** | Yes, at the top | Yes (Unpin) | Puts a post first in the feed, with a Pinned label. |

Bulk actions (Dismiss reports, Hide, Unhide, Delete forever) apply the same single-item action to each ticked row, up to 100 at a time.

A sensible order when unsure: **Hide first** (nothing is lost), then delete only when you're certain.

## 8. Under the hood

For anyone who works on the code.

**Technology**

- **Next.js 16** (App Router) with **React 19** and **Tailwind CSS 4**, written in TypeScript. This Next.js has breaking changes from older versions; the guides in `node_modules/next/dist/docs/` are the reference (see `AGENTS.md`).
- **Supabase** (a hosted Postgres database) accessed with `supabase-js`.
- Hosted on **Vercel**. The admin's login uses a signed cookie made with `jose`.
- Icons from `lucide-react`; fonts Outfit (headings) and Plus Jakarta Sans (text) through `next/font`.

**Database tables**

| Table | Holds |
|---|---|
| `anon_users` | Each browser's random name and secret token |
| `posts` | The problems people post (with hidden / pinned flags) |
| `advices` | Replies to posts |
| `advice_votes` | Who upvoted which reply (this is what enforces one vote each) |
| `reports` | Who reported which item |
| `banned_devices` | Banned tokens and the reason |
| `blocked_words` | The owner's extra blocked words |
| `settings` | The banner: `announcement` (message), `announcement_title`, `announcement_theme` and `announcement_active` |
| `admin_login_attempts` | Failed sign-ins, for the lockout |

**Admin SQL functions** (all in `supabase/admin.sql`, runnable only with the service-role key unless noted): `admin_dashboard`, `admin_reports_list`, `admin_content_list`, `admin_stats`, `admin_bans`, and the moderation functions. `popular_categories` (behind Trending Topics) is readable by the public site.

**Where things live**

| Folder | Contents |
|---|---|
| `app/` | The pages: the public site, and `app/admin/` for the admin |
| `components/ui/` | The shared building blocks: buttons, cards, tabs, badges, tables, logo |
| `components/shell/` | The frames: `PublicShell` and `AdminShell` (sidebar, top bar, mobile menu) |
| `components/site/` | The public pages' pieces: post cards, feed list, forms |
| `components/admin/` | The admin pages' pieces: tables, chart, settings forms |
| `lib/` | Helpers: identity, safety check, categories, feed queries, display helpers, and `lib/admin/` for the admin logic |
| `public/images/` | The logo, hero, door and people artwork |
| `supabase/` | The SQL: `schema.sql` (the original tables), `seed.sql` (ten starter posts), `admin.sql` (the admin's additions, safe to re-run) |
| `design/` | The reference mockups (`design/reference/`) and the untouched original logo (`design/brand/`) |
| `proxy.ts` | The first gate in front of every `/admin` address |
| `docs/` | Documentation (see below) |

**The logo and images.** They are imported in code (for example `import logo from '@/public/images/logo.png'`), so Next.js fingerprints them: replacing a file in `public/images/` shows up immediately, and no visitor is served an old copy. The browser-tab icon is `app/icon.png` (plus `app/favicon.ico` and `app/apple-icon.png`); replace those too when the logo changes.

**Running it on your computer**

```
npm install
npm run dev        # then open http://localhost:3000
npm test           # 172 unit tests
```

It needs a `.env.local` file with the two public Supabase values (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and, for the admin, the three secrets listed in [`admin-setup.md`](admin-setup.md). Never put admin secrets anywhere that begins with `NEXT_PUBLIC_`.

## 9. Limits worth knowing

- **Bans and one-vote-per-browser can be dodged** by clearing the browser's site data, because identity is only a token in the browser.
- **Report counts are advisory.** Someone technical could inflate them, so treat the queue as a guide and judge the content yourself. Severity (Low / Medium / High) is only a count of reports, not a judgement of the content.
- **Device tokens aren't fully private.** The database currently lets anyone holding the site's public key read them. The admin's export leaves them out, and tightening this is a recommended follow-up.
- **The safety check is blunt and runs in the visitor's browser.** It can block harmless text, and a determined person can bypass it. The owner's blocked-words list is readable by anyone who looks.
- **Visitors can't edit or delete their own posts**, and there are no notifications and no way to contact another user or the owner.
- **Search matches text inside posts only**, not categories or author names, and is a plain "contains" match rather than a ranked search.
- **The admin has one shared password and no audit log**, so it can't tell you who did what if more than one person ever uses it.

## 10. More documentation

| File | What it covers |
|---|---|
| [`admin-setup.md`](admin-setup.md) | Setting up and deploying the admin: secrets, the SQL to run, going live |
| [`monetization-ideas.md`](monetization-ideas.md) | Ways the project could earn money later, and what each needs first |
| [`superpowers/specs/2026-09-18-v1-mvp-design.md`](superpowers/specs/2026-09-18-v1-mvp-design.md) | The design for the public site (version 1) |
| [`superpowers/specs/2026-09-18-admin-design.md`](superpowers/specs/2026-09-18-admin-design.md) | The design for the admin, including its security decisions |
| [`superpowers/specs/2026-09-19-ui-redesign-design.md`](superpowers/specs/2026-09-19-ui-redesign-design.md) | The design for the current look (the redesign), and what was left out on purpose |
| [`superpowers/plans/`](superpowers/plans/) | The step-by-step build plans |
