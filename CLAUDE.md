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
| `Hero` | `Hero.jsx` | Picks `PhoneHero` (scroll-snap, CSS-sized) or `StageHero` (3D coverflow, JS-sized) by `PHONE_QUERY`. Desktop cards grow on big screens (2026-11-25): title card `max(1180, 65vw)` wide, stage `max(760, 62vh)` tall, photo caps likewise; the card text scales from 1820px (`desktop.css` last block). Up to ~1440×900 nothing changed |
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
| `ScrollHint` | `ScrollHint.jsx` | **Scroll-down hint** (2026-11-27). Shown only for the phone layout (`PHONE_QUERY`) on touch devices; mouse users never see it. **What it looks like:** a drawn hand (ivory with an antique-gold outline, burgundy velvet cuff with gold piping, `public/assets/hint/hand.webp`, 10 KB, owner's pick "A") sits centred near the bottom of the screen. Its index finger rests on the glass, then the whole hand slides straight up like scrolling Facebook while gold dust trails the fingertip. At the top it lifts (scales up 7 % around the palm, shadow moves out), travels back down, sets down and swipes again. One cycle is 2.3 s (`CY` = `--sh-cy`): touch 0.16 s, glide 1.1 s sine, lift 0.22 s, back 0.62 s, set down 0.2 s. The motion copies the approved fal video (`docs/scroll-hint-3d.html`) but is built in CSS with one image, so it runs at 60 fps. Hand geometry (`HAND` in u) was measured from that image; dust delays are the inverse of the sine glide. "Vuốt xuống / ĐỂ XEM THÊM Ạ" follows the swipe rhythm. While it shows, the whole screen dims (`rgba(22,3,6,.56)` plus a spotlight); repeats dim a touch less. **Rules:** first show 6.5 s after `hm-intro-end`, or after mount when there is no intro. It never shows while a finger is down, and waits 1 s after lift. Each show runs 3 cycles (≈ 7 s) and then turns itself off. It repeats after 5 s idle, max 3 times; every show carries the text (owner). It is a layer of the whole screen, not part of the hero (owner): it can show on any section where the guest stops, but never while `#rsvp` or the footer is on screen, at the page end, in the lightbox, while typing, or when the tab is hidden. A tap that is not on a button, link or photo scrolls on: from the hero to `#groom`, elsewhere by 0.8 vh. Scrolls driven by the nav (`data-nav-pin`) do not count as learned. A guest who scrolls down half a screen sets `sessionStorage['hm-scroll-hint'] = 'learned'`: the hint stops for that tab, reloads included, but a link opened in a new tab counts as a fresh visit (owner). The old `localStorage` key is removed on load. Horizontal carousel swipes deliberately do not reset the idle timer (owner's call). **Position:** the fingertip rests on the screen's centre line; the hand's bottom sits 5u above the bottom plus the bottom safe area; the text sits above the top of the glide. Sizes use `--u` = 3.9 px. **Code:** styles are the `sh-` classes at the end of `mobile.css`. Source art and scripts live in `~/Downloads/wedding-video/scroll3d/` (`art/A-1.png`, `art_prep.py`, `glide4.py`) |
| `IntroGate` | `intro/IntroGate.jsx` | **Envelope before the intro** (all formats; full overview for the owner in `docs/intro-overview.md`). Burgundy envelope, lace-cut flaps, embossed flowers, gold wax seal with the HM logo. The clip is placed from the measured hero card rect (`clipBox`, `CLIP_CARD`/`CLIP_CARD_W` = the card's fraction of the clip frame) — never cover-cropped (v1 missed the card on tall Android phones). Portrait: 2:3 clips with the floral background and card baked in (`open-{card,video}.mp4`, `idle-*.jpg`). Landscape + desktop (`wide`): the same clips rotated 90° clockwise (seal flap opens upward, seal redrawn upright), as a 3:2 envelope centred in the card (`fit32`) with a **transparent background** so the page's own floral pattern shows (`open-*-w.webm` VP9 alpha for Chrome/Android/Firefox, `open-*-wa.mp4` HEVC alpha for Safari/iPhone via `APPLE`, `idle-*-w.webp`). The hero card keeps its own size — a fixed 3:2 card was tried and rejected ("hero bị thu bé"). `reveal` (reload) opens onto the empty red card, otherwise onto the video's first frame (`poster-join.jpg`). Each idle still = its clip's first frame. Clips play every Kling frame at 60 fps (owner wanted it faster; never drop frames), flaps settle at `GATE_CUT_S` 1.77 s, then the clip fades over `GATE_FADE_MS` (portrait reload holds the last frame instead). On Android landscape the tap also enters fullscreen (`useLandscapeFullscreen`, capture phase, sets `html[data-fs-pending]`); the gate waits for the resize + 350 ms before opening so it opens at the new card position. The "Chạm để mở thiệp" pill sits under the envelope (`ctaPlace`), or on the bottom flap under the seal when there is no room (`.ig-cta.on-flap`). Build pipeline and pitfalls: `docs/intro-overview.md` and `~/Downloads/wedding-video/envelope/v2/README.md` — notably: retime with `-fps_mode passthrough`, tag BT.709/sRGB, never key the red card against the flaps, never take shading from Kling's own photo when the inside photo differs. Classes `ig-*`. |
| `IntroVideo` | `intro/IntroVideo.jsx` | **Opening overlay on `/`** (11/2026). Helpers: `intro/plan.js` (decides once per load: format, files, first visit vs reload), `intro/geometry.js` (`frameBox` video frame — desktop 16:9 never above 1920×1080 device px, landscape full height, portrait framed; `cardRect`; `fit32`; `settleTransform` fallback), `intro/music.js`, `intro/IntroDebug.jsx` (`?introdebug=1`). Phases: wait (admin on/off from `site_config.intro_video`, `'off'` = off; until known the overlay is only the hero red, no video download) → gate (IntroGate) → play → (loop while the page loads, max 8 s) → done; `still` (reduced motion / Save-Data / video failure) shows `poster-card.jpg`. Deep links (`#rsvp`…) skip it. First visit: the video starts at `JOIN_S` 1.2 s (`#t=1.2` in the URL — Safari ignores a scripted seek before load), real `<img>` poster until `playing`, main video warmed inside the tap. Portrait plays inside the card; desktop (2026-11-25, owner: envelope / red card / video frame should be one size) widens the 3:2 frame to the real hero card once the gate has faded (`frameMode` 'widened') and plays the video cover-cropped in the card; foldables / tablets in landscape (height ≥ 521px, e.g. iPhone Duo open) do the same, and there the hero card widens to 3:2 of its height (`sections.css` tablet-landscape block) so envelope, video and card are one size; low landscape phones grow the frame to `frameBox` (`frameMode` 'video', old gold double border). Landscape uses the desktop video. At `CARD_AT_S` 10.15 s the video pauses and the frame becomes the real card (`toCard`, re-measured every 120 ms while the desktop stage settles), the picture fades to #4A000B. **HM seal mark** (2026-11-27, owner picked style B of `docs/hero-blank-fx.html`): while the red card is still empty, `.intro-seal` (above the gate) shows the gold HM medallion at 0.42 opacity with one gloss sweep (`SEAL_MS` 650; first visit starts `SEAL_IN_CARD_MS` 250 after `toCard`, landscape video-frame mode when the frame is about to land; reload — owner 27/11: "hiện ngay lúc mở ra" — as soon as the card centre is uncovered, `IntroGate` `onReveal` at `GATE_REVEAL_S` 1.3 s, measured on the open-card clips, ~0.47 s before the flaps settle), and exists only on the overlay: the View Transition fades it out (~0.5 s) before the real card's text rises (owner 27/11: an earlier version kept a copy on the real card that faded with the text — "vẫn hơi hiện khi chữ hiện lên"). The overlay waits for the mark: portrait reload still leaves ~200 ms after the cut (the mark has finished by then), first visit waits ≥ 900 ms (portrait/desktop) / 1300 ms (landscape phone) after `toCard`. Safari traps found here: (1) **Safari leaves `<video>` out of the View Transition snapshot** — on portrait reload the red card was only the envelope clip's last frame, so card + flaps vanished for ~0.2 s; now `IntroGate` copies that frame to a `<canvas>` (`step-hold`) and `onGateCut` also shows the frame's own red card underneath. (2) Position the mark with `position: absolute` + `transform` only (`translate(-38.1%, -50%)`, centred on the H M oval, which sits 11.9% left of the PNG centre); a grid item with % height + `aspect-ratio`, or the separate `translate` property, landed ~13 px off in Safari's snapshot. Verified 2026-11-27 on 14 viewports (Chrome) + iPhone 17 portrait/landscape + iPhone Duo open (Safari sim). Reload: no video, the frame is the empty red card under the envelope (landscape: 3:2 then `frameMode` 'widened' to the real card). **The overlay leaves through a View Transition** (`leave()`): Safari only re-tints the status bar/toolbar when the overlay is removed; the nav shows inside the transition (`html[data-intro-in]`) and `hm-intro-leave` fires only after it has finished — any CSS transition still running when a View Transition ends is restarted by Safari. `App` keeps the page's own opening animation waiting for `hm-intro-leave`; under the overlay the hero card sits in its final state (`html[data-intro] .hm-track/.hero-stage`). Videos: one 12.9 s cut per format folder (`public/assets/intro/{portrait,desktop}/`: `full.mp4`, `full-720.mp4` on 3G / `downlink` < 6, `loop.mp4`, `poster-join.jpg`, `poster-card.jpg`; `landscape/` only has `poster-card.jpg`), 24 fps native Kling frames, wide cuts are the portrait clips reframed to 16:9 (Luma Ray 3.2); bump `VER` in `plan.js` when replacing files. **Intro music** (separate from the playlist): default `intro-music.m4a`, admin can replace it (`admin/sections/IntroMusic.jsx`, keys `intro_music`, `intro_music_name`, `intro_music_start`); Web Audio GainNode 0.16 → 0.55 (iOS ignores `audio.volume`), `navigator.audioSession.type = 'playback'`. The envelope tap is the gesture that allows sound; if music is still blocked the overlay shows "♪ Chạm để bật nhạc" and that tap starts the music instead of skipping; otherwise tap/wheel/key skips and "Bỏ qua" always skips. Music follows the video (re-seeked when it drifts > 0.3 s). `Nav` holds the site music while `html[data-intro="on"]` and starts it 3 s after `hm-intro-end`. Sources: `~/Downloads/wedding-video/` |
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
- Dark: `--ink-bg` #190A0B · `--footer-bg` #240A0B
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
- Folder uploads rename files with `storageSafeName()` (`lib/safeName.js`): Supabase Storage
  rejects keys with Vietnamese letters or `[ ] # %` ("InvalidKey"). Music keeps the original
  title in the entry's `caption`, which the player (`Nav.jsx` `trackName`) reads first.
- All three admin upload paths call `uploadVariants()` (`lib/imageVariants.js`), which
  builds the variants in the browser (JPEG fallback on Safari, which cannot encode WebP).
- **`sizes` is measured, never hand-written** (11/2026, `hooks/useFrameSizes.js`, used by
  `MediaImage` and `HeroPhoto` in `Hero.jsx`): the `<img>` renders without `src` first, a layout
  effect reads its box, the photo aspect (`sources.aspect`), `object-fit` and the applied `--fz`
  (so desktop and phone each use their own zoom), then sets `sizes` = needed CSS px × `HEADROOM`
  1.25 and only then `srcset`/`src` (in that order). srcset carries the **real** file widths.
  A zero-width box (display:none) loads nothing until a ResizeObserver sees it. The hand-written
  `sizes` were off by 1.5–2× (phone landscape) and the old "divide srcset by the larger of the
  two zooms" over-fetched on desktop. Headroom 1.25 because a file that just fits renders softer
  than a larger one downscaled: measured against renders from the 3000px original, AVIF at 1.25×
  is as sharp or sharper than the old WebP picks in every case; 1.0× was not (bride, landscape).
  If a variant fails to load `MediaImage` retries the original once.
- **AVIF** (11/2026): `opt.avif: true` = every width in `opt.w` also exists as
  `_opt/<folder>/<name>-<w>.avif` (same `?v=`). Browsers cannot encode AVIF, so admin uploads
  still make WebP only (a new upload builds a fresh `opt` without the flag → WebP, never a stale
  AVIF); `app/scripts/make-avif.mjs` (sharp, q60 4:2:0 effort 6, from the stored original) makes
  them and sets the flag — re-run it after uploading new photos. q60 AVIF is closer to the original
  than the WebP q78 variants (≈ WebP q85–90) at the same or smaller size. `storage.js` probes AVIF
  support once with a 2×2 data URI (in parallel with `site_config`) and `sourcesFor()` picks
  `.avif` paths only when both the flag and the probe say yes. `normalizeOpt()` keeps `avif`;
  `variantStoragePaths()` deletes the `.avif` files too.
- Hero priority: phone — the photo on screen (or photo 1 while the title card shows) gets
  `fetchpriority="high"`; desktop — the centre and the two adjacent cards; the rest `low`.
- Measured: one phone visit loads ~1 MB of photos (was ~42 MB). 11/2026 with AVIF + measured
  sizes (full scroll, 4G emulation): portrait 1440 → 1403 KB, landscape 1484 → 1095 KB, desktop
  2404 → 2295 KB, every photo as sharp or sharper than before. Without the AVIF files (code
  deployed alone) WebP at 1.25× is heavier on portrait (+14%): upload AVIF first. Load test against
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
- Many text keys have **no row** in `site_config`; the guest page then shows the fallback written in the component
  (`siteText.x || '…'`). `TextSettings.jsx` mirrors those fallbacks in `DEFAULTS` (shown as placeholders) — update
  both together. `saveMultiple(updates, meta)` updates existing rows and inserts a row only for a missing key with
  non-empty text (before 2026-11-25 it only ran `update`, so edits to missing keys silently did nothing).
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
