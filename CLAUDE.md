# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **personal, one-time-use** Vietnamese wedding invitation website ("Web cưới") for
Hiếu & Minh, dated **15.01.2027**. This project is not intended to be reused, forked,
or turned into a template. There is no need for generalization, abstraction, or
configurability beyond what serves this single wedding.

Originally a handoff bundle from Claude Design (HTML/CSS/JS prototypes), now migrated
to a production React + Vite + Supabase build in the `app/` directory.

## IMPORTANT: Active Codebase

**The production app lives in `app/`** — a React + Vite + Supabase build.
**All code changes MUST be made in `app/src/`.**

Three directories are NOT used by `npm run dev` and must never be edited for production:

- `project/` — the original prototype (CDN React + Babel standalone).
- `handoff/` — design handoff bundle, snapshot of **2026-09-18**, now stale.
- `handoff-mobile/` — design handoff bundle, snapshot of **2026-10-31**, current.
  Built for the mobile (portrait + landscape) redesign. Intentionally preserves
  production's bugs; see its `BUG-DOSSIER.md`.

## Key Entry Point

Start from `app/src/App.jsx`, then explore `app/src/components/` and `app/src/hooks/`.

## Architecture

React 18 + Vite SPA with Supabase backend. `react-router-dom` splits the guest site
from the admin area.

- `app/src/main.jsx` — Entry point
- `app/src/App.jsx` — Guest site root. Section flow:
  **Hero → Family (groom) → Family (bride) → WeddingInfo → Timeline → RSVP → Footer**
  There is **no opening gate** — it was removed on 2026-11-02 for all screens including
  desktop. Section ids: `hero`, `groom`, `bride`, `details`, `timeline`, `rsvp` (no `home`).
- `app/src/components/` — One component per section file
- `app/src/hooks/` — Custom hooks
- `app/src/lib/` — Supabase client, config, media manifest, storage, upload queue
- `app/src/admin/` — Admin area (single user; low design value)
- `app/src/styles/globals.css` — Tokens, reset, keyframes, Nav, music player, lightbox
- `app/src/styles/sections.css` — Per-section styling, animations, responsive

### Component Map

| Component | File | Purpose |
|-----------|------|---------|
| `Hero` | `Hero.jsx` | Picks `PhoneHero` (scroll-snap, CSS-sized) or `StageHero` (3D coverflow, JS-sized) by `PHONE_QUERY` |
| `ScriptName` | `ScriptName.jsx` | Names in TAN Whistling; draws the missing `ế`/`ệ` accents in CSS |
| `Tagline` | `Tagline.jsx` | Strips quotes/period from the tagline, breaks before "của cuộc đời" |
| `Ico` | `Icon.jsx` | Line icons for the vinyl-record music player |
| `Family` | `Family.jsx` | Reused for both groom and bride sides (prop `side`) |
| `WeddingInfo` | `WeddingInfo.jsx` | Formal invitation card with map/phone CTAs |
| `Timeline` | `Timeline.jsx` | Event schedule + live countdown timer |
| `RSVP` | `RSVP.jsx` | Name, side (Nhà trai/Nhà gái), guest count, phone, note → `rsvps`; or a wish → `wishes` |
| `Nav` | `Nav.jsx` | Sticky nav after gate opens; **full music player** (playlist, seek, volume, loop) |
| `Footer` | `Footer.jsx` | Simple closing |
| `MediaImage` | `MediaImage.jsx` | Image with Supabase fallback chain + lightbox |
| `Lightbox` | `Lightbox.jsx` | Full-screen photo overlay (context provider) |
| `ErrorBoundary` | `ErrorBoundary.jsx` | Catches render errors |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useSiteConfig` | `useSiteConfig.js` | Wedding config + site text from Supabase |
| `useMedia` | `useMedia.js` | `useMediaUrl()` / `useMediaList()` over Storage |
| `useViewport` | `useViewport.js` | `vw`/`vh` plus `isPhone` from `PHONE_QUERY` (see below) |
| `useCountdown` | `useCountdown.js` | Counts down to the ceremony in **+07:00**, not local time. Days are **not** zero-padded |
| `usePhoneReveal` | `usePhoneReveal.js` | IntersectionObserver reveal for phones (`[data-rv]` → `.rv-in`) |

Shared helpers: `lib/phone.js` (`formatVNPhone`, `toE164VN`, `GUEST_OPTIONS`, `guestLabel`)
and `lib/scrollLock.js` (pins `body` on touch devices; used only by the lightbox).

### Data & Config

Wedding details load from Supabase via `useSiteConfig()`. Family members, timeline
events, and media come from Supabase tables and storage. Fallback defaults live in
`app/src/lib/config.js`.

## Assets

- `app/public/fonts/` — Four self-hosted families, subset to latin/latin-ext/vietnamese
- `app/public/assets/` — Medallion images (gold, ink)
- Media served from Supabase Storage with placeholder fallbacks
- Photo placeholders render as `<div className="ph" data-label="...">`
- `app/public/icons.svg`, `favicon.svg`, `assets/medallion.jpg` are **unreferenced** leftovers

## Design Tokens (from globals.css)

Palette is **red lacquer + gold + ivory**:

- Backgrounds: `--paper` #FBF5EC · `--paper-2` #F6EDE0 · `--card` #FFFCF5
- Dark: `--ink-bg` #190A0B · `--footer-bg` #240A0B · `--gate-bg` #160607
- Red: `--red` #7E1416 · `--red-deep` #5E0F11 · doors `--door-1/2/3`
- Gold: `--gold` #A8803C · `--gold-soft` #D8B778
- Text: `--ink` #33231F · `--ink-soft` #6B564F · `--muted` #8C7A72

Fonts — **five**:

- `--serif` Cormorant Garamond — most large text, **including the countdown digits**
- `--sans` Inter — small text and forms
- `--mono` JetBrains Mono — four places only
- `--script` **TAN Whistling** — names via `ScriptName`, and the H/M signature over the
  portraits. Not on Google Fonts; self-hosted.
- **Playfair Display** — the phone invitation card and family section. Self-hosted
  (18 woff2 + SIL OFL licence in `app/public/fonts/`).

Language: Bilingual Vietnamese/English throughout.

## Running Locally

There are no unit tests by decision of the owner — verify changes by manual testing in
the browser at phone (portrait + landscape), tablet and desktop sizes.


```bash
cd app
npm run dev     # Vite dev server
```

Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Without them the
app still renders: `lib/supabase.js` substitutes a dummy client, so content falls
back to `lib/config.js` defaults and images become `.ph` placeholders.

## Implementation Notes

- **Breakpoints are one string, used twice.** `PHONE_QUERY` in `hooks/useViewport.js`
  must match the `@media` blocks in `sections.css` **character for character** (29
  occurrences). Change one side without the other and the layout breaks.

  ```
  (max-width: 759.98px), (max-height: 520px),
  (max-width: 1199.98px) and (max-aspect-ratio: 5/6),
  (hover: none) and (pointer: coarse) and (max-width: 1439.98px)
  ```

  "Phone layout" therefore covers: narrow screens, **short** screens (phone in
  landscape), tablets/foldables in portrait, and any touch screen under 1440px.
  The desktop block is its own complement and uses a **nested `@media`** — Vite
  passes it through unchanged; verify this still holds after any bundler upgrade.
- **Two reveal mechanisms, by design.** Phones use `usePhoneReveal`
  (IntersectionObserver, `[data-rv]` → `.rv-in`) so it works on iOS 17/18. Desktop
  keeps CSS scroll-driven animations (`.rv` + `animation-timeline: view()`), which
  Safari supports only from 26 and Firefox not by default.
- `Hero` sizes **desktop** carousel cards in JS (needs width, height and photo
  orientation at once). The phone carousel is pure CSS `scroll-snap` — no JS swipe
  handling, so it cannot skip two photos.
- `MediaImage` fallback chain: Supabase URL → local fallback → `.ph` div
- Lightbox uses React Context (`LightboxProvider` in App.jsx) and `lib/scrollLock.js`
- The vinyl-record music player is gated on `html[data-player="dia"]`, set once in
  `main.jsx`. Desktop keeps the old player — CSS hides the new parts.

## Images & Performance

Wedding photos live in Supabase Storage bucket `media`, but guests never download the
originals (4–14 MB camera files). Each photo has WebP variants at 480/960/1280/1600px
under **`_opt/<folder>/<name>-<width>.webp`** — outside the six media folders, so the
admin "Quét lại kho" (rescan) never picks them up as photos.

- The manifest row `site_config.media_manifest` lists every file. An entry's `opt`
  field (`{ v, fmt, w: [...] }`) says which variants exist. `variantPaths()` only uses
  them when `opt.v === v` — a replaced photo whose variants were not regenerated falls
  back to the original instead of showing the old image.
- `normalizeEntry()` must keep `opt`; every manifest write goes through it.
- Variant URLs carry `?v=` and are cached for a year (`max-age=31536000`), so a new
  upload is a new URL. The Supabase CDN returns `HIT` for them.
- All three admin upload paths call `uploadVariants()` (`lib/imageVariants.js`), which
  builds the variants in the browser (JPEG fallback on Safari, which cannot encode WebP).
- `MediaImage` takes a `sizes` prop; set it to the slot's real width or the browser
  over-fetches. If a variant fails to load it retries the original once.
- Measured: one phone visit loads ~1 MB of photos (was ~42 MB). Load test against
  production, 600 visitors in 60 s: 0 errors, p95 ≤ 121 ms for every request type.

Two traps found during the mobile port:

- `usePhoneReveal` must also watch `[data-rv]` nodes added after first render (timeline
  rows are replaced when Supabase data arrives) and restore `rv-in` when React rewrites
  `className`. Missing either leaves visible content stuck at opacity 0.
- Horizontal overflow from the slide-in buttons is clipped on `.rsvp` with
  `overflow-x: clip`. **Do not** put overflow on `html`: it stops `body`'s overflow from
  propagating to the viewport, and the lightbox scroll lock (`body.style.overflow`)
  silently stops working.

## Admin

- The **Khách xác nhận** and **Lời chúc** tabs (`admin/sections/RSVPList.jsx`,
  `WishList.jsx`) were redesigned by Claude Design in 11/2026; source bundle in
  `handoff-admin/`. Their styles are the `rw-` classes at the end of `admin.css`.
  `admin.css` is kept **byte-identical** to the design file so a future redesign can
  simply be copied over it.
- The admin route also loads the guest site's `globals.css`. Its
  `-webkit-font-smoothing: antialiased` thins the admin text on macOS, so
  `admin/admin-isolation.css` resets it. Put any future admin-vs-guest CSS
  conflict fixes there, not in `admin.css`.
- The "Đã gọi" button is intentionally disabled: it waits on backend request **BR-1**
  (`rsvps.called_at`, see `handoff-admin/BACKEND-REQUESTS.md`), not built yet.

## Database

Tables: `site_config`, `family_members`, `timeline_events`, `rsvps`, `wishes`,
`admin_emails`, plus the `rsvp_summary` view.

- **RLS is on for all of them** (migration `20261110000000`). Guests (anon) may only
  INSERT into `rsvps`/`wishes` and SELECT the three content tables. Admin access is an
  allowlist: `public.is_admin()` checks the JWT email against `admin_emails`. It is
  **not** `auth.role() = 'authenticated'`, because self-signup is enabled on the
  project — anyone could register and become an admin.
- `rsvps` keeps its original columns (`guest_count` is an **integer**). "Trên 10 người"
  is stored as `guest_count = 10` plus `guests_over_10 = true`. The form's "Ghi chú"
  field reuses the existing `message` column.
- Never call `.insert(...).select()` from the guest site — anon has no SELECT grant,
  so Supabase returns an RLS error even though the row was written.

Migrations live in `supabase/migrations/`.
