# Handoff: Trình chỉnh khung ảnh (Admin › Media)

## Overview

A new feature for the wedding site's admin **Media** page. The owner picks which part of a
photo is kept in each frame on the guest page by dragging, zooming and (for new photos)
rotating. Before saving, they see a **faithful preview of the real frame** on both desktop
and phone. The data model is **focal point + zoom** with two profiles, `d` (desktop) and `m`
(phone). There is no free crop rectangle.

All UI copy is Vietnamese and must be used verbatim (strings are in `prototype/ImageFramer.jsx`
and `prototype/app.jsx`).

## About the Design Files

The files in `prototype/` are **design references built in HTML/React (Babel in-browser)**.
They are prototypes that show the intended look and behavior. They are not production code to
ship as-is. Recreate them in the existing app (`app/src/admin/`, React) using its patterns.
That said, `ImageFramer.jsx`, `frames.js` and `styles/image-framer.css` were written to port
almost directly: plain React 18, pointer events, no libraries, all class names prefixed `if-`.

Run the prototype: `cd prototype && python3 -m http.server 8000` → `http://localhost:8000`
(or double-click `start.command`). `file://` does not work.

URL params: `?open=bride|groom|right|left|moment|album0|album1|timeline0|sideways|heic`,
`&profile=m`, `&fail=1` (next upload fails), `&slow=1` (6 s upload), `&w=390&h=844` (render
inside a fixed-size box, used for screenshots).

## Fidelity

**High-fidelity.** Final colors, type, spacing, copy and interactions. It follows the existing
`admin.css` look (Inter + Cormorant Garamond, rose-brown palette). **`admin.css` must stay
byte-identical.** All new styles live in `image-framer.css`.

## Files to port

| Prototype | Production target |
|---|---|
| `prototype/ImageFramer.jsx` | `app/src/admin/ImageFramer.jsx` (replace `window.X = X` with `export`) |
| `prototype/frames.js` | `app/src/admin/framerFrames.js` (export `framesFor`, `FRAMER_BLOB`) |
| `prototype/styles/image-framer.css` | `app/src/admin/image-framer.css` |
| `prototype/app.jsx` | **do not port**: mock Media page. Use it as a wiring reference for `MediaManager.jsx` |
| `prototype/styles/admin.css` | verbatim copy of production. Do not modify |

The CSS rule `img.has-fit` at the top of `image-framer.css` is a copy of the guest-page rule.
In production, import a single shared source if possible.

---

## Data contract (summary — full text in `DATA-CONTRACT.md`)

**Input props**
```js
<ImageFramer
  slot="portraits/bride.jpg"   // selects the frame set (frames.js)
  label="Chân dung cô dâu"
  src={url}                    // blob: (new local file) or https:
  isNew={bool}                 // true → Rotate button + primary "Tải lên"; false → "Lưu khung"
  fit={{ d:{x,y,z}, m:{x,y,z}|null } | null}   // null = center {50,50,1}
  naturalW={1066} naturalH={1600}
  // UI-only (no backend impact):
  fileName="IMG_2041.HEIC"     // used to detect HEIC in the "can't open" message
  initialProfile="d"|"m"       // open on phone profile (app passes 'm' when viewport ≤ 768)
  onSave={(result, reportProgress) => Promise}
  onCancel={() => {}}
  onPickAnother={() => {}}     // optional → shows "Chọn ảnh khác" when image fails to open
/>
```

**Output (`onSave` first arg)**
```js
{ fit: { d: {x, y, z}, m: {x, y, z} | null }, rotate: 0|90|180|270 /* only when isNew */ }
```
- `x, y` ∈ 0–100, rounded to 0.1. `z` ∈ 1–3, rounded to 0.01.
- `m: null` ⇔ toggle "Điện thoại dùng chung khung với máy tính" is ON.
- Fit is computed on the **rotated** image.

**Guest-page CSS (used verbatim for every preview)**
```css
img.has-fit {
  object-fit: cover;
  object-position: var(--fx) var(--fy);
  transform: scale(var(--fz));
  transform-origin: var(--fx) var(--fy);
}
/* phone layouts use --mfx --mfy --mfz */
```
`fitVars(fit)` → `{ '--fx': x+'%', '--fy': y+'%', '--fz': z }` set as inline style on the img.
The img is `width:100%; height:100%; display:block` inside a wrapper with `overflow:hidden`
and the frame's `border-radius`.

---

## Core math (`coverGeom` in ImageFramer.jsx)

For a frame W×H and an image w×h with fit {x,y,z}:
```
s  = max(W/w, H/h)              // cover scale
iw = w*s, ih = h*s
slackX = iw*z − W               // px of image beyond the frame horizontally (≤0 → axis locked)
slackY = ih*z − H
// rendered image rect (for the dimmed "ghost" around the frame):
px = W*x/100, py = H*y/100, ox = (W−iw)*x/100, oy = (H−ih)*y/100
left = px + (ox−px)*z, top = py + (oy−py)*z, width = iw*z, height = ih*z
```
**Drag mapping (1:1 with the finger):** a drag of `dx` px changes
`x -= dx / slackX * 100` (clamped 0–100), and the same for y. If `slackX ≤ 0.5` the axis does
not move. With `z ≥ 1` and `x,y` in 0–100 an empty gap can never show, so there is no
"out of bounds" state.

**Focal marker** sits at `(W*x/100, H*y/100)` in frame coords. That point stays at the same
relative position in every frame.

---

## Frames per slot (`frames.js`, from DATA-CONTRACT §3)

Each frame: `{ id, profile:'d'|'m', ratio (w/h), shape:'rect'|'arch'|'blob', radius, decor, overlap, natural, title, short, sub }`.

| Slot | Desktop (`d`) | Phone (`m`) |
|---|---|---|
| `carousel/*` | portrait img → card 1/1.34, landscape → 3/2; decor `blurbg` (same image blurred behind) | 2/3 card, decor `maroon` (#5A1F22 bg) |
| `portraits/groom.jpg`, `bride.jpg` | arch 3/4 | arch 3/4 + `gold` border · arch 0.6 (landscape narrowest) · arch 1.0 (landscape widest) |
| `background/right.jpg` | blob 3/4 | blob 3/4 |
| `background/left.jpg` | blob 4/5 | blob 4/5 |
| `timeline/*` | 4/3 rect | 3/2 rect |
| `background/moment-2.jpg` | 16/9 rect r4, decor `countdown` overlap 0.09 | `natural` (portrait phone shows the whole image, not editable) · 560/428 countdown overlap 0.12 |

Shapes:
- **arch**: `border-radius: ${W/2}px ${W/2}px ${b}px ${b}px`, `b = max(2, round(W*8/340))`.
  This is the guest page's `280px 280px 8px 8px` as rendered when the frame is narrower than
  560px (a semicircle top).
- **blob**: `48% 52% 56% 44% / 54% 46% 54% 46%`.
- **gold**: overlay span, same radius, `border: 1.5px solid #C9A86A`.
- **countdown chip**: absolute, `top = H*(1−overlap)`, `left = W*0.22`, `width = W*0.56`,
  `height = max(16, H*0.24)`, bg `#fffaf7`, radius 6, shadow `0 4px 14px rgba(60,40,38,.22)`,
  text "Còn 23 ngày" in Cormorant Garamond 500, font-size `max(8, chipH*0.34)`. On the stage it
  has opacity .94.

Assumption: phone landscape/tablet uses profile `m`. To change it, edit `profile` in frames.js.

---

## Screens / Views

Screenshots are in `screens/` (1440×900, 390×844, 844×390).

### 1. Media page — entry points (`screens/1440-00-trang-media.png`)
Existing `admin-layout` / `admin-sidebar` / `admin-main` / `admin-card` / `slot-grid` /
`slot-card` from admin.css. What's added:
- **Thumbnail** `slot-preview if-thumb if-thumb-{kind}`. It has the true desktop aspect ratio
  and applies the saved `fit.d` via `<img class="has-fit">` inside `.if-thumb-pic`
  (overflow hidden, radius inherit). The border is `1px solid #e8e2e0` (hover `#B58285`) and
  the background is `#f1eeec`.
  - `arch` 90×120, radius `45px 45px 4px 4px` · `blob34` 90×120 blob · `blob45` 96×120 blob ·
    `wide` 142×80 radius 5 · `43` 120×90 radius 4.
  - Clicking the thumbnail opens the file picker, as it does today. After a file is picked,
    the framer opens with `isNew`. It no longer uploads immediately.
- **Status line** (`slot-status`, `.filled` when set): "Khung: giữa ảnh (chưa chỉnh)" or
  "Khung đã chỉnh · điện thoại dùng chung" / "… điện thoại có khung riêng".
- **Actions row** `.if-slot-act` (flex, gap 8, margin-top 10) with two buttons:
  - `rw-btn if-go` "Chỉnh khung": border `#B58285`, text `#9C6567`, hover bg `#fdf5f5`.
  - `rw-btn` "Đổi ảnh".
  - Height 34px, or 44px under 768px, where the row is also centered.
- **Album** `.if-album`: grid `repeat(auto-fill, minmax(150px,1fr))` gap 14, or 2 columns with
  gap 10 under 768px.
  - Each item is a `media-item` holding `.if-album-pic` with aspect 3/4 (3/2 if the image is
    landscape).
  - Below the picture: file name, then state "Đã chỉnh khung" (#5e7d6f) or "Giữa ảnh"
    (#A89996), then a full-width "Chỉnh khung" button.
  - Add tile `.if-album-add`: 2px dashed #e8e2e0, radius 10, min-height 200, "+" 26px #B58285,
    label "Thêm ảnh vào album".
- **Lịch trình** card: one slot-card per milestone, thumb `43`.
- Toast after save: existing `admin-toast`. Text is "Đã lưu khung — {label}" or
  "Đã tải lên — {label}", dismissed after 2.8 s.

### 2. ImageFramer — desktop layout `desk` (`screens/1440-0*.png`)
The framer measures **itself** (ResizeObserver), not media queries:
`desk` if w ≥ 900 && h ≥ 560 · `land` if w > h && h < 560 · otherwise `phone`.

- Root `.if-root`: `position:fixed; inset:0; z-index:100`. On desk the backdrop is
  `rgba(60,45,43,.45)` with padding 24, and the shell is centered.
- Shell: white, `max-width 1280`, `max-height 900`, radius 16,
  shadow `0 24px 80px rgba(40,25,22,.3)`. Column flex.
- **Header** (padding 16 20 14 24, bottom border #e8e2e0):
  - Eyebrow 11px, uppercase, letter-spacing .12em, #7F706C, weight 500: "Chỉnh khung", or for
    new images "Ảnh mới · chỉnh khung trước khi tải lên".
  - Title h2: Cormorant Garamond 24px/1.15, weight 500, #6B5E5B, ellipsis.
  - Close button 40×40, radius 10, hover bg #f1eeec.
- **Body** grid `minmax(0,1fr) 440px`:
  - **Left column**: stage (flex 1) plus the under-bar.
    - Under-bar: bg #faf8f7, top border, padding 12 20. It holds the controls and help text
      (12px #7F706C): "Kéo ảnh để dời · lăn chuột hoặc chụm hai ngón để phóng · dấu ⊙ là điểm
      luôn được giữ ở mọi khung".
  - **Right column** `.if-side`: left border, padding 20, gap 14, scrolls. It holds the profile
    switch, the share toggle and the preview groups.
- **Footer**:
  - Padding 14 20 14 24, top border.
  - Reassurance text (12.5px #7F706C, flex 1): "Khách bấm vào ảnh vẫn xem được ảnh đầy đủ —
    khung chỉ chọn phần hiện trong ô, không cắt file gốc."
  - Buttons: `admin-btn admin-btn-secondary` "Huỷ" and `admin-btn admin-btn-primary` (min-width
    150) with the primary label. Both min-height 42, padding 0 22, 14px.

### 3. ImageFramer — phone portrait `phone` (`screens/390-0*.png`)
Full screen, column flex, top to bottom:
1. **Header**: padding 10 16 8, plus safe-area-inset-top. h2 20px, eyebrow 10px. No close
   button (Huỷ is in the bottom bar).
2. **`.if-top`** (padding 8 16, gap 6): profile segmented control (height 38), then the share
   toggle row (min-height 40, 13px).
3. **Stage**: flex 1, the biggest area (≈380px tall at 390×844).
4. **Controls** row: padding 8 16, nowrap, bottom border #f0eded.
   - "Về giữa" 44px tall · − 44×44 · range slider (flex 1, 44 tall) · + 44×44 · "Xoay"
     (new images only). No zoom value.
5. **Preview strip** `.if-strip`: horizontal scroll with hidden scrollbar and
   overscroll-x contain, padding 10 16 8.
   - Both groups sit inline: group label 10px uppercase, frames 84px tall, caption = `short`
     label 11.5px weight 500 nowrap.
6. Reassurance: "Khách bấm vào ảnh vẫn xem được ảnh đầy đủ." (11.5px, padding 0 16 8).
7. **Bottom bar** `.if-bar`:
   - Grid `1fr 2fr`, gap 10, padding 10 16 + safe-area-inset-bottom, top border.
   - Buttons 48px tall, 15px. The Save button is always visible.

### 4. ImageFramer — phone landscape `land` (`screens/844-0*.png`)
Shell is a row. The stage on the left fills the full height. The right panel is
`width: min(400px, 48%)` with a left border, column flex:
- Header: padding 8 14 6.
- `.if-scroll` (flex 1, overflow-y auto, padding 8 14, gap 8): segmented → share → controls
  (rotate shows icon only, 44×44) → preview strip (72px frames) → reassurance.
- Bottom bar: padding 8 14, buttons 44 tall.

---

## Components (inside ImageFramer)

### Stage `.if-stage` (the drag area)
- Background `#2e2725`, overflow hidden, `display:grid; place-items:center`.
- `touch-action:none; overscroll-behavior:contain; user-select:none;
  -webkit-touch-callout:none`.
- Cursor `grab`, or `grabbing` while `.dragging`. `tabIndex=0`, `role="application"`.
- Focus-visible: `inset 0 0 0 2px #B58285`.
- Frame size: fit `active.ratio` inside (stage − 2·pad). pad = 48 on desk, 18 on land, 22 on
  phone.
- Children of `.if-canvas` (W×H, relative):
  - **Ghost** `img.if-ghost`: absolute at the `coverGeom` rect, opacity .3, pointer-events none.
    It shows the parts that get cut.
  - **Frame** `.if-frame`: absolute 0,0, W×H, overflow hidden, shape radius, bg #1d1817.
    Shadow `0 0 0 1px rgba(255,255,255,.6), 0 12px 40px rgba(0,0,0,.35)`. Holds the
    `has-fit` img.
  - Gold overlay or countdown chip, if the frame has that decor.
  - **Focal marker** `.if-focus`: 24×24 circle with a 1.5px white border, shadow
    `0 0 0 1px rgba(0,0,0,.25), 0 1px 5px rgba(0,0,0,.4)`, and a 4px white center dot.
    Opacity .55 while dragging.
- **Stage tag** (top-left 12/12): bg `rgba(30,22,20,.66)`, white 12px, radius 8, padding 5 10,
  max-width min(420px, 100%−24).
  - Shows the frame **title** in bold. On desk it also shows `sub` in #e8e2e0.
- **Locked hint** (bottom center, same chip style): "Ảnh vừa khít khung này — phóng to để chọn
  phần giữ lại". Shown when both slacks are ≤ 0.5 and the user is not dragging.
- **Loading**: spinner (26px, 2px border rgba(255,255,255,.25), top white, .8 s linear) and
  "Đang mở ảnh…" in #e8e2e0 14px.
- **Image error**: title in Cormorant 24px white "Không mở được ảnh này", then body text:
  - HEIC (`fileName`/`src` matches `.heic|.heif`): "Có vẻ đây là ảnh HEIC từ iPhone — Chrome
    chưa mở được loại này. Mở trang quản trị bằng Safari, hoặc chọn bản JPG của ảnh."
  - Otherwise: "File có thể bị hỏng hoặc không phải ảnh. Thử chọn ảnh khác nhé."
  - The preview strip is hidden.
  - Buttons become "Đóng" plus "Chọn ảnh khác" (if `onPickAnother` is provided).

### Profile switch `.if-seg` (role=tablist)
- Container: bg #f1eeec, radius 10, padding 3, gap 2.
- Two buttons "Máy tính" / "Điện thoại", flex 1, height 36 (38 on phone), 14px.
- Active button: white bg, weight 600, #9C6567, shadow `0 1px 2px rgba(107,94,91,.18)`.
- "Điện thoại" carries a pill `.if-seg-sub` reading "chung" or "riêng": 11px weight 500,
  radius 6, padding 1 6. Bg #f1eeec / #7F706C normally, #fdf5f5 / #9C6567 when its tab is
  active.

### Share toggle `.if-share`
- Label: "Điện thoại dùng chung khung với máy tính", 13.5px (13 on phone/land).
- Switch track 42×24, radius 12: #d9d0cd when off, #B58285 when on. Knob 18px white with a
  .15 s transform.
- Hidden native `<input type=checkbox role=switch>`.
- Desk-only helper text (12px #7F706C):
  - Phone profile with sharing on: "Đang chung: kéo ở đây là đổi cả khung máy tính."
  - Sharing off: "Điện thoại có khung riêng. Bật lại là bỏ khung riêng này."

### Controls `.if-controls`
- **"Về giữa"** (`.if-tbtn`): resets the current profile to {50,50,1}. Disabled when already
  centered.
- **−** and **+** (`.if-ibtn`, 36×36, 44×44 on phone): zoom ±0.1.
- **Range slider**: 1–3, step 0.01, `accent-color #B58285`.
- **Zoom value** (desk only, 12.5px tabular): e.g. "1,43×" with a Vietnamese decimal comma.
- **"Xoay"** (new images only): +90° clockwise.
- Button style: 1px #e8e2e0 border, radius 8, white bg, 13px weight 500. Hover bg #faf8f7 and
  border #d6cbc8. Disabled opacity .45.

### Preview groups / strip
- Desk `.if-groups`: two cards, "MÁY TÍNH" and "ĐIỆN THOẠI".
  - Card: 1px #e8e2e0, radius 12, padding 12 14 14.
  - Active profile's card: border #e2c9ca, bg #fdf8f8.
  - Header: 11px uppercase, .1em spacing. Phone card adds "dùng chung khung máy tính" or
    "khung riêng".
- Preview heights: desk 170 for `d` and 128 for `m`; phone 84; land 72.
- Group notes (desk, 12px #7F706C):
  - moment: "Điện thoại dọc hiện trọn ảnh, không cắt — khung chỉ áp khi xoay ngang."
  - portraits: "Màn ngang: vòm cao bằng khối chữ bên cạnh nên tỉ lệ đổi theo máy — xem cả lúc
    hẹp nhất và rộng nhất."
- **Preview item** `.if-pv` (button):
  - Box sizes:
    - `blurbg`: box `1.6h × h`, card `0.84h` tall, centered. Background is the same image,
      `filter: blur(8px) brightness(.8)`, inset −10%.
    - `maroon`: box `0.5h × h` with bg #5A1F22, card width 86%.
    - `countdown`: box height = `fh*(1−overlap) + max(16, fh*.24)`.
    - Plain frames: width = h·ratio, capped at 1.9h.
  - Selected: a 2px #B58285 ring at inset −5px, radius 10, and the caption turns #9C6567.
  - Clicking a preview makes that frame the stage frame and switches profile. The `title`
    attribute shows `title — sub`.
  - `natural` frames are static (not clickable) and carry the badge "Không cắt": 10px white on
    rgba(30,22,20,.7), radius 6.

### Save / error / progress
- Primary label:
  - Default: "Tải lên" (new) or "Lưu khung" (existing).
  - While saving: "Đang tải lên… N%" (new) or "Đang lưu…" (existing).
  - After an error: "Thử tải lên lại" or "Thử lưu lại".
- **Progress bar** `.if-progress`: 3px at the top edge of the footer/bar, track #f1eeec, fill
  #B58285.
  - With `reportProgress`: width = N%.
  - Without it: indeterminate, 35% wide, sliding 1 s ease-in-out infinite.
- While saving, every control is disabled, the stage canvas drops to opacity .6, and Esc/Huỷ are
  blocked.
- **Error banner** `.if-err`: bg #fdecea, text #9b2c22, 13px/1.5, radius 10, padding 10 14,
  placed above the buttons, `role=alert`. Text: "Tải lên chưa được ({message}). Khung bạn vừa
  chỉnh vẫn còn nguyên — thử lại nhé." (For existing images it starts with "Lưu chưa được".)

---

## Interactions & Behavior

- **Drag** (1 pointer): the image follows the finger 1:1 using the mapping above. It stops at
  the image edge and does nothing on a locked axis. Uses `setPointerCapture`.
- **Pinch** (2 pointers): `z = z0 · dist/dist0`, clamped 1–3. Moving the midpoint also pans.
- **Wheel / trackpad pinch**: native listener with `{passive:false}` and `preventDefault`;
  `z *= exp(−deltaY · 0.0015)`.
- **Keyboard** (stage focused):
  - Arrow keys pan 8px (Shift: 40px).
  - `+`/`=` and `−` zoom ±0.1.
  - `0` returns to center.
  - Esc (window-level) cancels, unless saving.
- **Page scroll lock**: while open, `document.documentElement.style.overflow = 'hidden'`, restored
  on unmount.
- **Share toggle**:
  - ON → keep `fm` in a backup ref, set `fm = null`.
  - OFF → `fm = backup ?? copy of fd`.
  - With sharing ON, editing on the Phone tab edits `fd`.
- **Rotate** (new only): `rotate = (rotate+90)%360`, and both fits reset to center.
  - Preview uses a canvas-rotated data URL, max side 2400, JPEG .9.
  - Frames are recomputed from the rotated dimensions (carousel desktop switches between 3:4
    and 3:2).
- **Frame switching**: changing profile resets the stage to that profile's first editable frame.
  Clicking a preview selects that frame.
- **Save**:
  - Existing image: `onSave` resolves fast (data write only). The parent closes the framer and
    shows the toast.
  - New image: the parent uploads, may call `reportProgress`, and rejects with `Error` on
    failure.
  - The parent receives the original file + `rotate`. Server or client rotates it. Fit refers
    to the rotated image.
- **Opening on phone**: the app passes `initialProfile='m'` when the viewport is ≤ 768px (the
  owner is probably fixing what they see on the phone).

## State (ImageFramer)

| State | Meaning |
|---|---|
| `img {status:'loading'|'ready'|'error', src, w, h}` | decoded (and possibly rotated) image |
| `rotate` | 0/90/180/270 |
| `fd`, `fm` | desktop fit, phone fit (`null` when shared) |
| `shared` | share toggle, initial `!fit.m` |
| `profile`, `activeId` | which profile / frame is on the stage |
| `phase 'edit'|'saving'|'error'`, `progress`, `errMsg` | save lifecycle |
| `dragging` | cursor + focal-marker opacity |
| sizes via `useElementSize` | callback-ref + ResizeObserver; measures immediately and after each render. **Needed because the stage DOM node changes when the layout mode changes.** |

## Design Tokens

| Token | Value | Use |
|---|---|---|
| ink | `#6B5E5B` | primary text |
| ink-2 | `#5E524F` | — |
| muted | `#7F706C` | secondary text (AA on white) |
| muted-2 | `#A89996` | tertiary / placeholder |
| rose | `#B58285` | accent, primary button, slider, selection ring |
| rose-dark | `#9C6567` | active text, primary hover |
| line | `#e8e2e0` | borders |
| line-2 | `#f0eded` | inner dividers |
| line-hover | `#d6cbc8` | border hover |
| bg | `#f8f6f5` | page |
| soft | `#faf8f7` | under-bar, hover |
| chip-bg | `#f1eeec` | segmented bg, skeleton, thumb bg |
| pink | `#fdf5f5` / `#fdf8f8` / `#e2c9ca` | active tint / active group bg / active group border |
| success | `#5e7d6f` | "Khung đã chỉnh" |
| error | `#fdecea` bg / `#9b2c22` text | upload error |
| stage | `#2e2725` | drag area |
| frame-bg | `#1d1817` | behind img in stage frame |
| gold | `#C9A86A` | phone-arch border |
| maroon | `#5A1F22` | phone carousel bg |
| overlay | `rgba(60,45,43,.45)` | desk backdrop |

**Type**:
- Inter for UI: 10–15px, weights 400/500/600.
- Cormorant Garamond 500 for titles (20/24px) and the countdown chip.
- Sizes used: 10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15.

**Radii**: 4–6 (frames, chips), 8 (buttons, tags), 10 (segmented, banners, selection ring),
12 (groups), 16 (desk shell).

**Hit targets**: 44px minimum on phone and land.

## Assets

- `prototype/photos/` are real test photos supplied by the owner (1600px):
  - `moment-2.jpg` is the portrait-into-16:9 case.
  - `sideways.jpg` tests Rotate (it needs 3 rotations).
  - `left/right.jpg` have white scan borders and need zoom ≈1.1.
- `prototype/fonts/` are self-hosted fonts, identical to production.
- Icons are inline SVG in `IfIcon`: rotate, minus, plus, close, center. Stroke 1.8, round caps.
  Nothing external.

## Open questions → `BACKEND-REQUESTS.md`

No new fields are required. Three things need confirming:
- Q-1: does phone landscape use `m`?
- Q-2: does the upload API report progress? Optional.
- Q-3: who applies `rotate`?

## Files in this bundle

```
README.md               this file
DESIGN-BRIEF.md         original brief
DATA-CONTRACT.md        original contract (source of truth for data)
COMPONENT-MAP.md        props / states / Media-page wiring, short form
BACKEND-REQUESTS.md     open questions for backend
screens/                1440×900, 390×844, 844×390 screenshots
prototype/              runnable prototype (index.html + ImageFramer.jsx + frames.js + app.jsx + styles/ + fonts/ + photos/)
```

## Acceptance checklist

- [ ] `admin.css` unchanged (byte diff = 0).
- [ ] Every preview uses `img.has-fit` with the same `--fx/--fy/--fz` the guest page uses.
      A saved fit looks identical on the guest page at 1440×900, 390×844 and 844×390.
- [ ] 390×844:
  - [ ] Save is visible without scrolling.
  - [ ] Dragging does not scroll the page.
  - [ ] Pinch zoom works.
- [ ] 844×390 is usable: Save is visible, and the panel scrolls independently.
- [ ] New image goes from pick to framer, then to upload with progress and error/retry.
- [ ] HEIC on Chrome shows the HEIC message.
- [ ] Thumbnails on the Media page reflect the saved `fit.d`.
