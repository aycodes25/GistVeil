# GistVeil — Monetization Ideas

Working list of ways to eventually make money from GistVeil, once there's a
real, active user base. None of this is built or committed to — V1 (see
`docs/superpowers/specs/2026-09-18-v1-mvp-design.md`) deliberately ships with
zero monetization so the product can prove people actually use it first.

These ideas are grouped, and each one includes what it needs before it's
worth building — so this doc can double as a rough sequencing guide, not
just a brainstorm dump.

## Ideas from the original WhatsApp brainstorm (kept for reference)

1. **Ads** — Google AdSense on web, AdMob if/when there's a native app.
2. **Sponsored / pinned post** — a local business pays to pin a post (e.g.
   "best affordable food near campus?" with their shop as the top reply).
3. **Affiliate links** — recommendation threads ("best power bank for a
   dorm?") link out to affiliate products.
4. **Premium anonymous identity** — pay for a custom name/color/badge
   instead of the default `Anon #1234`.
5. **Promoted posts for events/campaigns** — a time-boxed paid pin for
   elections, launches, announcements.
6. **Anonymous "connect" requests** — pay a small fee to DM someone whose
   post you related to; they can accept or ignore.
7. **Trend reports for brands** — sell aggregated, anonymized trend
   insights ("X% of posts this month are about Y"), never raw user data.
8. **White-label for other communities** — license the same product to a
   different school, city, or interest group for a setup + monthly fee.
9. **"Buy me data" / tip jar** — a small voluntary-support button.

## Additional ideas — not limited to students, general audience

### Attention & advertising
- **Native/contextual ads** — an ad styled like a post card in the feed
  (clearly labeled "Sponsored"), rather than a banner — higher engagement,
  lower annoyance than a bottom banner.
- **Category sponsorship** — a brand sponsors an entire category page (e.g.
  a budgeting app sponsors "Money", a telehealth service sponsors "Mental
  Health") with a small persistent header credit.
- **Programmatic ad network** (AdSense/Ezoic/Mediavine-style) once traffic
  is large enough to qualify for better-paying networks than AdSense alone.

### Subscriptions / premium tiers
- **Ad-free tier** — flat monthly fee to remove ads, the most standard SaaS
  lever once there's a stable DAU.
- **"Priority advice" tier** — paying users' posts get a visual priority
  boost in the feed for a limited window (careful: must stay clearly
  labeled to preserve trust — undisclosed pay-to-rank erodes an anonymous
  advice product's core value fast).
- **Advanced filters/search** — free tier gets the basic feed; paid tier
  gets saved searches, category digests, or a "similar problems" view.

### Marketplace / services layer
- **Verified expert marketplace** — therapists, career coaches, financial
  advisors, lawyers offering paid anonymous consultations, with GistVeil
  taking a commission (this was in the original brainstorm as a Nigeria/
  Africa-specific therapist angle — the same model works globally with
  the right category of expert per vertical: legal, financial, medical,
  career, relationship coaching, etc.)
- **Crisis/support-line partnerships** — mental-health categories partner
  with (and are compensated by) actual crisis support orgs for a
  "talk to someone now" handoff button — revenue via partnership/grant
  funding rather than a per-click fee, and it's also genuinely good for
  users.

### Data & insights (aggregate only, never individual)
- **Anonymized trend reports** sold to brands, researchers, universities,
  HR departments, or local governments — "what are people actually
  worried about this month, in this category, in this region" — this is
  a real, defensible product once volume is high enough to aggregate
  safely (must be genuinely anonymized/aggregated, not just "we don't
  sell it labeled" — re-identification risk has to be taken seriously).
- **Academic/research licensing** — sociology, psychology, and public
  health researchers pay for anonymized, aggregated access to study real
  social sentiment at scale.

### Platform & licensing
- **White-label / franchise model** — license the whole platform to
  other communities: universities, companies (internal anonymous
  feedback), professional associations, even other countries' markets —
  setup fee + monthly hosting/support fee.
- **API access** — once there's a real corpus of anonymized trend data,
  sell API access to that data stream to third-party apps/dashboards.
- **Embeddable widget** — a "submit anonymous feedback" widget other
  sites/apps embed (e.g. a company's internal portal), white-labeled,
  paid per seat or per submission volume.

### Community-funded
- **Tipping specific advice-givers** — let posters optionally tip the
  advice they found most helpful; platform takes a cut (similar to
  Reddit Gold/Awards, but with real money).
- **Community/org sponsorship** — a university counseling center, an HR
  department, or a nonprofit pays a flat fee to be the "backing partner"
  for a category, in exchange for a visible (but not spammy) presence.

## Sequencing guidance

Don't build any of this before V1 has real, sustained usage (see the
spec's own monetization timeline — ads first, once there's meaningful
daily active use; everything else later). The riskiest ones to get wrong
early are the ones that touch trust directly — paid pinning/ranking and
any data product — because an anonymous advice platform's entire value is
that people believe the feed and the replies are real and unmanipulated.
Whatever ships first should be the one that's hardest to mistake for
"the platform quietly favoring whoever paid."
