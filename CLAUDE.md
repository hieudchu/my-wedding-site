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

These directories are NOT used by `npm run dev` and must never be edited for production:

- `project/` — the original prototype (CDN React + Babel standalone).
- `handoff/` — design handoff bundle, snapshot of **2026-09-18**, now stale.
- `handoff-mobile/` — design handoff bundle, snapshot of **2026-10-31**, current.
  Built for the mobile (portrait + landscape) redesign. Intentionally preserves
  production's bugs; see its `BUG-DOSSIER.md`.
- `handoff-mobile-v2/` — handoff bundle for Claude Design, snapshot of **2026-11-17**, current.
  Phone portrait + landscape UI/UX pass. `app.jsx`/`styles/` are generated verbatim from
  `app/src` by its `tools/build-from-production.mjs`; `INTERACTIONS.md` documents every
  control. Its `tools/fetch-data.mjs` forces `opt.v`/`fit.v` = `v` in the copied manifest.
- `handoff-share-image/` — small Claude Design bundle (2026-11-18) for the `/adult` link-preview
  image: `index.html` is the current 1200×630 image, `tools/render.mjs` exports it to JPEG.
- `handoff-adult/` — handoff bundle for Claude Design, snapshot of **2026-11-17**: the `/adult`
  page base build that Claude Design started from. **Stale** since the 2026-11-18 redesign.

## Key Entry Point

Start from `app/src/App.jsx`, then explore `app/src/components/` and `app/src/hooks/`.

## Architecture

React 18 + Vite SPA with Supabase backend. `react-router-dom` splits the guest site
from the admin area.

- `app/src/main.jsx` — Entry point
- `app/src/App.jsx` — Guest site root. Section flow:
  **Hero → Family (groom) → Family (bride) → WeddingInfo → Timeline → RSVP → Footer**
  **`/adult`** (2026-11-17, redesigned 2026-11-18 from the Claude Design bundle
  `~/Downloads/design_handoff_adult_page`) is a second guest page: the invitation the **parents of
  both families** send to their colleagues and bosses. Red hero card → one paper invitation card
  (two columns on desktop) → one album-mounted photo → RSVP (name + attending yes/no + optional
  message) → footer, plus a floating "Xác nhận tham dự" bubble. No music/timeline/countdown.
  Lazy route in `main.jsx`, code in `app/src/adult/` (`AdultApp.jsx`, `AdultRSVP.jsx`,
  `AdultDecor.jsx` SVG frame/sprig/seal, `useAdultScrollFx.js`, `adult.css` with `a-` classes, no
  `PHONE_QUERY`; motion flags live on `.a-page`, never on `html`). Scroll with `adultScrollTo`,
  never `scrollIntoView` (Zalo webview / iframes scroll the parent). The bubble is measured with
  `getBoundingClientRect` on `scroll`, not IntersectionObserver. Its own text keys
  `adult_venue_title|hall|address`, `adult_party_time` (migration `20261118000000`) fall back to
  the shared keys when empty. Writes `rsvps` rows with `audience = 'adult'` and **also records
  declines** (`attending = false`) through the rpc `adult_rsvp_save` (migration `20261118000100`):
  the browser keeps a random `edit_token` in `localStorage['hm-adult-rsvp']`, so a guest who changes
  their mind updates their row (`updated_at`) instead of adding one, and on return sees the thank-you
  card with "Sửa lại xác nhận". Anon cannot insert a row with `edit_token` set directly; admin lists them in their own section **`/admin/rsvp-adult`**
  (`AdultRSVPList.jsx`: merges re-sends by folded name, CSV export, the four text keys); the main
  "Khách xác nhận" tab shows `audience = 'guest'` only. Its link preview is its own: `vite.config.js`
  copies the built `index.html` to `adult.html` with the `/adult` title/description/`og-adult-4.jpg`.
  `vercel.json` sends `/adult`, `/thiep-moi` and `/thiep-moi/:v` (same page; the link to send) to the
  function **`api/share-adult.js`**, which serves `adult.html` with `og:image` swapped for the image
  chosen in admin (`site_config.share_adult_image`, a `media/share/adult-<id>.jpg` path; empty = the
  default) and `og:url` = `/thiep-moi/<id>`, because Zalo groups previews by `og:url`. Any error →
  plain `adult.html`. Admin › Khách bố mẹ mời › "Ảnh xem trước khi gửi link" (`AdultShareImage.jsx`)
  crops uploads to 1200×630 JPEG < 120 KB. Design bundle for the image: `handoff-share-image/`.
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
| `Nav` | `Nav.jsx` | Sticky nav; owns all music state (playlist, seek, volume, loop). **Music always on** (2026-11-17): tries to play at load, else on the first tap/key anywhere; a guest pause is respected; pauses while the tab is hidden. Phones get no music pill in the nav — the panel lives in `MusicBubble` |
| `MusicBubble` | `MusicBubble.jsx` | Phones only: draggable floating music bubble (spring physics written straight to `style.transform`), portalled to `body` because the nav's `backdrop-filter` would anchor `fixed` children to the nav. Drag to the × to hide; ☰ › "Bật lại nhạc nền" restores it. Position in `localStorage['hm-music-bubble']` |
| `Footer` | `Footer.jsx` | Simple closing |
| `IntroVideo` | `IntroVideo.jsx` | Opening video on `/` (11/2026), shown in a gold-edged frame over the hero's red floral background (`frameBox`: desktop 16:9 never larger than 1920×1080 device pixels so it is never upscaled; phone landscape full height with side borders only; portrait a framed box). Videos are 24 fps native Kling frames (no interpolation), sharpened; the landscape and desktop cuts are the approved portrait clips widened to 16:9 with Luma Ray 3.2 Reframe (fal), so every detail matches the portrait; bump `VER` when replacing files. Three AI-made cuts in `public/assets/intro/{portrait,landscape,desktop}/` picked by `PHONE_QUERY` + orientation; each ends on the red hero card. First visit `full.mp4` (16.6 s), later visits (`localStorage['hm-intro-seen']`) `short.mp4` (2.5 s), then `loop.mp4` while `useSiteConfig` is still loading (max 8 s). Any tap/key/wheel skips — the event still reaches `Nav`, so it also starts the music. At 12.6 s (`OPEN_AT`; the short cut and the still card start open) the frame opens to full screen and its gold edge fades, so the video's card ending is never a small card inside the frame. At a natural end the frame is scaled so the video's card lands exactly on the real `.hm-title`/`.hero-title-card` (card rects in `CARD`, measured at 390×844, 844×390, 1440×900) before it fades. Skipped for deep links (`#rsvp` etc.); reduced motion / Save-Data / autoplay failure show `poster-card.jpg` instead. Admin › Thông tin chung has an on/off switch (`admin/sections/IntroSwitch.jsx`, upserts `site_config.intro_video`; `'off'` = off, missing = on); until `useSiteConfig` answers, the overlay is only the hero red, so "off" never downloads a video. **Intro music** (separate from the playlist): default `public/assets/intro/intro-music.m4a` ("Một đời" instrumental, pre-cut from 6 s to match the cuts); admin can upload another (`admin/sections/IntroMusic.jsx` → `media/intro/…`, keys `intro_music`, `intro_music_name`, `intro_music_start`). Played through a Web Audio GainNode (iOS ignores `audio.volume`) ramping 0.16 → 0.55 over the video; `navigator.audioSession.type = 'playback'` so the iPhone silent switch does not mute it. Video and music both try to start on load. Browsers block audible autoplay until the guest touches the page (every iPhone; Chrome on Windows/Mac/Android on a first visit), so then the overlay shows "♪ Chạm để bật nhạc": that tap (touchend/click/keydown — iOS does not count pointerup) starts the music in sync instead of skipping; otherwise a tap/wheel/key skips, and a "Bỏ qua" button (top right) always skips. A no-buttons version was tried and dropped on 2026-11-20: Chrome blocked the music for the owner on every device. `play()` waits up to 0.8 s for the AudioContext to reach `running` before calling it blocked. After an intro that was shown, the site music waits 3 s and fades in. The music follows the video (pauses when Safari pauses the muted video, re-syncs on `playing`, and is re-seeked when it drifts > 0.3 s — iPhone starts audio ~0.8 s late after the tap). While `html[data-intro="on"]`, `Nav` holds the site music (a tap only play()+pause()s it to unlock iOS) and starts it on the `hm-intro-end` event — 3 s after the intro (owner: no immediate jump to the player), fading in over 2.5 s (not on iOS, which ignores `audio.volume`). `?introdebug=1` shows a state panel (works on phones). Sources: `~/Downloads/wedding-video/` |
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
| `usePhoneScrollFx` | `usePhoneScrollFx.js` | Phones: one passive scroll listener + rAF writes `--sp/--sx/--sf/--sd` on nearby `[data-sp]` elements and `--page-p`, `[data-nav-hide]`, `[data-scrolled]` on `html`; sets `html[data-sfx]` unless reduced motion. The scroll effects in `mobile.css` key off it. `Nav` sets `html[data-nav-pin]` so the nav does not hide during its own scrolls |
| `useLandscapeFullscreen` | `useLandscapeFullscreen.js` | Touch phone turned landscape → fullscreen on the first tap (`html[data-fs-ask]` hint), back to portrait → exits. No-op on iPhone (no Fullscreen API) |

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
- Upload paths stamp `v` with the admin's clock (`nowVersion`, a few seconds after storage
  received the original); "Quét lại kho" (`buildFromListing`) re-stamps `v` from storage. It
  therefore moves `opt.v`/`fit.v` along when the storage stamp is not newer than the old `v`
  (+120 s clock slack). Before 2026-11-17 it did not, and every rescanned photo silently fell
  back to the 3000px original with a centred crop (fixed in the live manifest the same day).
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

- **Landscape hero/footer texture** (2026-11-20): `floral-relief.jpg` is a portrait 675×1200 map, so `cover` on a
  landscape screen blew the flowers up ~1.8×. In the phone-landscape query the hero (`.hero--phone`), `.footer` and
  the intro overlay use `floral-relief-tile.jpg` (the map + its horizontal mirror, 1350×1200, seamless sideways) at
  `auto 100vmax` — the same flower size as portrait. The landscape intro video bakes the same (1920 px tile height).
- **Page background is a pre-blended image** (2026-11-18): `body` (and `/adult` `.a-page`) use
  `paper-floral-paper.jpg` / `paper-floral-desktop-paper.jpg` = the grey relief maps
  `paper-floral*.jpg` already overlay-blended onto `#F6EDE0`. Never go back to
  `background-blend-mode` on a tall element: iOS WebKit drops the blend on elements taller than
  ~3000px and every iPhone showed the raw grey texture. Changing `--paper-2` means re-baking both
  images. Short elements (hero, footer, cards) still use `overlay` safely.

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
- `rsvps.side` and `guest_count` are nullable since migration `20261117000000`. Until then they
  were still NOT NULL, so a main-site RSVP without a side or guest count failed silently (guests
  saw the thank-you card, the row was lost). `audience` is `'guest'` (main page) or `'adult'`.
  `rsvp_summary` groups adult rows as side `'adult'` (each attending row = 1 guest) and has a
  `declined` column.
- `rsvps` keeps its original columns (`guest_count` is an **integer**). "Trên 10 người"
  is stored as `guest_count = 10` plus `guests_over_10 = true`. The form's "Ghi chú"
  field reuses the existing `message` column.
- **Anti-spam** (migration `20261111000400`): a BEFORE INSERT trigger
  `guard_guest_submit()` on `rsvps`/`wishes` limits each IP (`cf-connecting-ip`, stored as
  md5 in `submit_log`, kept 1 day) to 6 per 10 min / 20 per day per table, and everyone to
  30 per minute per table; it silently drops a duplicate sent within 10 min. Over the limit
  it raises `rate_limited` (P0001) and `RSVP.jsx` shows a "try again later" notice instead
  of the thank-you card. Admins are exempt. Bulk-testing inserts trips it — clear
  `submit_log` afterwards. Since migration `20261118000400` (after a spam test on production),
  `guest_throttle()` also limits **edits** through the save rpcs (30 per IP / 10 min, 120/min
  site-wide → `rate_limited`) and `rsvp_phone_taken` lookups (40 per IP / 10 min, then it always
  answers false; the unique index still blocks the save). `phone_e164` must match `^\+[0-9]{8,15}$`.
  The `/adult` CSV export prefixes cells starting with `= + - @` with `'` (formula injection).
- **Guests edit instead of re-adding** (migrations `20261118000100`, `20261118000200`, helper
  `lib/editToken.js`): the browser keeps a random `edit_token` — main RSVP in
  `localStorage['hm-rsvp']`, wishes in **cookie** `hm_wish`, `/adult` in `localStorage['hm-adult-rsvp']`
  — and writes only through the security-definer rpcs `guest_rsvp_save` / `wish_save` /
  `adult_rsvp_save` (update the row with that token, else insert; `updated_at` marks edits). Anon
  cannot insert a row with `edit_token` set directly. On return the form is prefilled and the button
  reads "Cập nhật…". **`phone_e164` is unique among `audience = 'guest'` rows**
  (`rsvps_guest_phone_uq`): the form asks `rsvp_phone_taken` as the number is typed and shows
  "Số điện thoại này đã được xác nhận tham dự"; the save rpc raises `phone_taken` (P0001).
- Never call `.insert(...).select()` from the guest site — anon has no SELECT grant,
  so Supabase returns an RLS error even though the row was written.

Migrations live in `supabase/migrations/`.
