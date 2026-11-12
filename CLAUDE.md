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
- `app/src/styles/desktop.css` — Desktop redesign (11/2026, Claude Design bundle
  `~/Downloads/design_handoff_thiep_cuoi_desktop`). Loaded after `sections.css`; every rule
  sits inside the desktop complement of `PHONE_QUERY`, so it cannot touch phones. `d-` classes.
- `app/src/styles/mobile.css` — Phone features ported from the desktop redesign (2026-11-11):
  red "Xác nhận" in the ☰ menu, step corners on the invitation card, RSVP picks on one row
  with the illustration inside the thank-you card, and the DeskMotion effects. Loaded last;
  every rule sits inside `PHONE_QUERY`, so it cannot touch desktop.

### Component Map

| Component | File | Purpose |
|-----------|------|---------|
| `Hero` | `Hero.jsx` | Picks `PhoneHero` (scroll-snap, CSS-sized) or `StageHero` (3D coverflow, JS-sized) by `PHONE_QUERY` |
| `ScriptName` | `ScriptName.jsx` | Names in TAN Whistling; draws the missing `ế`/`ệ` accents in CSS |
| `Tagline` | `Tagline.jsx` | Strips quotes/period from the tagline, breaks before "của cuộc đời" |
| `Ico` | `Icon.jsx` | Line icons for the vinyl-record music player |
| `Family` | `Family.jsx` | Reused for both groom and bride sides (prop `side`) |
| `WeddingInfo` | `WeddingInfo.jsx` | Formal invitation card with map/phone CTAs. Desktop renders `DeskInfo` instead |
| `Timeline` | `Timeline.jsx` | Event schedule + live countdown timer. Desktop renders `DeskTimeline` (phone's `TimelineWave` + side photos `background/timeline-left|right.jpg`). Per-event photos (`image_path`) show nowhere any more |
| `RSVP` | `RSVP.jsx` | Name, side (Nhà trai/Nhà gái), guest count, phone, note → `rsvps`; or a wish → `wishes` |
| `Nav` | `Nav.jsx` | Sticky nav after gate opens; **full music player** (playlist, seek, volume, loop) |
| `Footer` | `Footer.jsx` | Simple closing |
| `DeskMotion` | `DeskMotion.jsx` | All screens (name is historical): `[data-dv]` → `[data-in]` draw-in ornaments, signatures, flip countdown, RSVP envelope; gold cursor sparkle on fine pointers only. Sets `html[data-dm]` unless reduced motion. Never put `clip-path` on a `[data-dv]` element itself — IntersectionObserver then never reports it; clip a child (`.d-sig b`, `.family-sig b`) |
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
| `useHashLanding` | `useHashLanding.js` | Opening `…/#rsvp` (the RSVP QR code) or another section id scrolls there and holds it under the nav for 6 s while photos above load; stops on any touch/wheel/key |
| `usePhoneReveal` | `usePhoneReveal.js` | IntersectionObserver reveal for phones (`[data-rv]` → `.rv-in`) |

Shared helpers: `lib/phone.js` (`formatVNPhone`, `toE164VN`, `GUEST_OPTIONS`, `guestLabel`)
and `lib/scrollLock.js` (pins `body` on touch devices; used only by the lightbox).

### Data & Config

Wedding details load from Supabase via `useSiteConfig()`. Family members, timeline
events, and media come from Supabase tables and storage. Fallback defaults live in
`app/src/lib/config.js`.

## Assets

- `app/public/fonts/` — Four self-hosted families, subset to latin/latin-ext/vietnamese
- `app/public/assets/` — Medallion images (gold, ink). Since 11/2026 these are the **only**
  medallions: nav logo, disc label, phone invitation card and footer read them directly; the
  admin has no medallion slot and the `icons` Storage folder is gone
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
originals. Each photo has WebP variants at 480/960/1280/1600/2000px (never upscaled)
under **`_opt/<folder>/<name>-<width>.webp`** — outside the six media folders, so the
admin "Quét lại kho" (rescan) never picks them up as photos.

- The manifest row `site_config.media_manifest` lists every file. An entry's `opt`
  field (`{ v, fmt, w: [...] }`) says which variants exist. `variantPaths()` only uses
  them when `opt.v === v` — a replaced photo whose variants were not regenerated falls
  back to the original instead of showing the old image.
- `normalizeEntry()` must keep `opt` **and `fit`**; every manifest write goes through it.
- **Image framing** (11/2026): an entry's `fit` (`{ v, d: {x,y,z}, m: {x,y,z} | null }`)
  is the admin-chosen focal point (% of the image) + zoom (1–3) for desktop (`d`) and
  phone layouts (`m`, null = same as `d`). Non-destructive: files are never cropped and
  the lightbox still shows the whole photo. `fitFor()` ignores a `fit` whose `v` differs
  from the entry's `v`, so a replaced photo falls back to centre.
  - Guest side: `lib/fit.js` puts `has-fit` + `--fd*`/`--fm*` vars on the `<img>`
    (`MediaImage`, both carousels in `Hero.jsx`). The rule is `img.has-fit` in
    `globals.css`; the PHONE_QUERY block in `sections.css` switches it to `--fm*`. The
    countdown photo is a fixed 2:3 frame on phones (portrait and landscape) since 2026-11-12;
    it used to show uncropped with no phone frame.
  - **Never hard-code a crop for one photo in CSS** (`object-position`/`scale` on a
    section's img). It used to be done for the bride/groom/invitation photos; those
    values now live in the manifest (migration `20261111000100`).
  - Admin side: `admin/ImageFramer.jsx` (ported from the Claude Design bundle in
    `handoff-media-editor/`), frame table `admin/framerFrames.js` — **update it when a
    section's image ratio/shape changes in `sections.css`**. Upload/save glue is
    `admin/framing.jsx` (`uploadFramed`, `saveFit`). Picking one image opens the framer
    before anything is uploaded; picking several uploads them centred.
- Variant URLs carry `?v=` and are cached for a year (`max-age=31536000`), so a new
  upload is a new URL. The Supabase CDN returns `HIT` for them.
- Admin uploads shrink the stored original to **3000px** long edge (`compressImage`,
  `rotateFile`). It was 1600px until 11/2026: a portrait became 1067px wide, and a frame
  zoomed 1.6–1.7× in the framer then had too few pixels → guests saw blurry photos.
  `sourcesFor()` divides each srcset `w` by the fit zoom so the browser fetches a variant
  big enough for the zoomed frame.
- Folder uploads rename files with `storageSafeName()` (`lib/safeName.js`): Supabase Storage
  rejects keys with Vietnamese letters or `[ ] # %` ("InvalidKey"). Music keeps the original
  title in the entry's `caption`, which the player (`Nav.jsx` `trackName`) reads first.
- All three admin upload paths call `uploadVariants()` (`lib/imageVariants.js`), which
  builds the variants in the browser (JPEG fallback on Safari, which cannot encode WebP).
- `MediaImage` takes a `sizes` prop; set it to the slot's real width or the browser
  over-fetches. If a variant fails to load it retries the original once.
- Measured: one phone visit loads ~1 MB of photos (was ~42 MB). Load test against
  production, 600 visitors in 60 s: 0 errors, p95 ≤ 121 ms for every request type.

- `index.html` starts the `site_config` fetch itself (plain `fetch`, `apikey` in the
  query string → no CORS preflight) in parallel with the JS download;
  `useSiteConfig` consumes `window.__siteConfig` once and falls back to supabase-js.
  This is what lets the photos start early — they wait on the manifest.
- Music: `preload="metadata"` 2 s after `load` (~73 KB per visit), never `auto`.
- The RSVP "sắp về chung một nhà" scene lives inside the thank-you card (`.rsvp-thanks-art`,
  all screens; there is no standalone `.rsvp-scene` any more) and is a 4 s muted loop (`public/assets/rsvp/couple-loop.mp4`,
  2.1 MB, `CoupleLoop` in `RSVP.jsx`) with `couple.jpg` as poster. `preload="none"`; an
  IntersectionObserver plays it near the viewport and pauses it off-screen. Reduced motion /
  iOS Low Power Mode just show the poster.
- Supabase **Free** plan: `.github/workflows/supabase-keepalive.yml` reads one row
  every 2 days so the project is not paused after 7 idle days. It needs no secrets — it
  reads the URL and publishable key from the live `index.html`.

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
- Admin only offers what guests can see (checked 11/2026 by swapping every `site_text`
  value for a marker and looking at desktop/phone/landscape/tablet). Text keys that no
  component renders (`gate_prompt*`, `info_announce_en`, `rsvp_success_*`,
  `rsvp_dress_code*`, `groom_bio`) and `family_members.name_en` are no longer editable; the
  rows/columns stay in the DB. When a design change hides or drops a text or photo, remove it
  from `TextSettings.jsx` / `MediaManager.jsx` SECTIONS too.
- RSVP rows can be hidden (reversible) or deleted for good ("Xoá", confirm dialog), like wishes.
- The image framer's styles are `admin/image-framer.css` (`if-` classes), not
  `admin.css`.
- "Đã gọi" (BR-1, 11/2026) stores the call time in `rsvps.called_at` (null = not
  called; click again to clear). Guests cannot set it: the anon insert policy requires
  `called_at is null`. Its styles live in `sections/RSVPList.css`, not `admin.css`.

## Database

Tables: `site_config`, `family_members`, `timeline_events`, `rsvps`, `wishes`,
`admin_emails`, plus the `rsvp_summary` view.

- **RLS is on for all of them** (migration `20261110000000`). Guests (anon) may only
  INSERT into `rsvps`/`wishes` and SELECT the three content tables. Admin access is an
  allowlist: `public.is_admin()` checks the JWT email against `admin_emails`. It is
  **not** `auth.role() = 'authenticated'`. Self-signup was enabled until 2026-11-11
  (now disabled; there is exactly one admin account), so never rely on "logged in"
  alone. The Storage `media` write policies use `is_admin()` too (migration
  `20261111000100`); before that, any self-registered user could delete every photo.
- `rsvps` keeps its original columns (`guest_count` is an **integer**). "Trên 10 người"
  is stored as `guest_count = 10` plus `guests_over_10 = true`. The form's "Ghi chú"
  field reuses the existing `message` column.
- **Anti-spam** (migration `20261111000400`): a BEFORE INSERT trigger
  `guard_guest_submit()` on `rsvps`/`wishes` limits each IP (`cf-connecting-ip`, stored as
  md5 in `submit_log`, kept 1 day) to 6 per 10 min / 20 per day per table, and everyone to
  30 per minute per table; it silently drops a duplicate sent within 10 min. Over the limit
  it raises `rate_limited` (P0001) and `RSVP.jsx` shows a "try again later" notice instead
  of the thank-you card. Admins are exempt. Bulk-testing inserts trips it — clear
  `submit_log` afterwards.
- Never call `.insert(...).select()` from the guest site — anon has no SELECT grant,
  so Supabase returns an RLS error even though the row was written.

Migrations live in `supabase/migrations/`.
