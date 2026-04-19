# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **personal, one-time-use** Vietnamese wedding invitation website ("Web cưới") for Minh & Hiếu, dated 08.11.2026. This project is not intended to be reused, forked, or turned into a template. There is no need for generalization, abstraction, or configurability beyond what serves this single wedding.

Originally a handoff bundle from Claude Design (HTML/CSS/JS prototypes), now migrated to a production React + Vite + Supabase build in the `app/` directory.

## Key Entry Point

**Read `project/Wedding.html` first**, then follow its imports. The user had this file open during handoff. It loads two stylesheets and one JSX file via Babel standalone (no build step).

## Architecture

Single-page React app rendered client-side via CDN React 18 + Babel standalone:

- `project/Wedding.html` — Shell: loads fonts (Cormorant Garamond, Inter, JetBrains Mono), CSS, CDN React/Babel, and `app.jsx`
- `project/app.jsx` — All React components in one file (~655 lines). Section flow: **Gate → Details → Family (Groom) → Family (Bride) → WeddingInfo → Timeline → RSVP → Footer**
- `project/styles/globals.css` — CSS variables (Dreamy Florals palette: blush/dusty-rose/taupe/sage), resets, typography
- `project/styles/sections.css` — Per-section styling, animations, responsive breakpoints

### Component Map (in app.jsx)

| Component | Section | Purpose |
|-----------|---------|---------|
| `GateHero` | 01 Gate | Opening doors animation, tap-to-open |
| `Details` | 02 Details | Save-the-date, horizontal photo carousel |
| `Family` | 03a/03b | Reused for both groom and bride sides (prop `side`) |
| `WeddingInfo` | 04 | Formal invitation card with map/phone CTAs |
| `Timeline` | 05 | Event schedule + live countdown timer |
| `RSVP` | 06 | Form with duplicate-name check via localStorage |
| `Nav` | — | Sticky nav, appears after gate opens; music toggle |
| `Footer` | — | Simple closing |
| `TweaksPanel` | — | Edit-mode panel for live customization (communicates with parent via postMessage) |

### Configurable Data

All wedding details are in `TWEAK_DEFAULTS` at the top of `app.jsx` (names, date, venue, phone, etc.). The `TweaksPanel` component allows live editing and syncs changes to a parent frame via `postMessage`.

## Assets

- `project/assets/` — Medallion images (gold, ink variants)
- `project/uploads/` — User-uploaded reference files (screenshots, PDF invitations)
- `project/tmp/` — Design iteration screenshots
- Photo placeholders use `<div className="ph" data-label="...">` — no actual photos yet

## Design Tokens (from globals.css)

- Fonts: `--serif` (Cormorant Garamond), `--sans` (Inter), `--mono` (JetBrains Mono)
- Primary palette: `--paper` (#FDF7F7), `--ink` (#6B5E5B), `--rose` (#B58285), `--sage` (#9CAEA9)
- Legacy aliases exist: `--gold` → `--rose`, `--burgundy` → `--rose-deep`
- Language: Bilingual Vietnamese/English throughout

## Running Locally

No build step. Serve the `project/` directory with any static server:

```bash
# Python
python3 -m http.server 8000 --directory project

# Node (npx)
npx serve project
```

Open `http://localhost:8000/Wedding.html` (or whichever port).

## Implementation Notes

- RSVP duplicate checking uses `localStorage` key `rsvp_names` — this is a prototype mock, not a real backend
- Scroll-reveal animations use `IntersectionObserver` via the `useReveal()` hook (class `.reveal` → `.in`)
- The gate opening animation uses CSS transforms on `.gate-door-l` / `.gate-door-r`
- Background music element exists (`<audio id="bgm">`) but has no `src` — wired to Nav toggle
