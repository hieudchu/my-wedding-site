# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **personal, one-time-use** Vietnamese wedding invitation website ("Web cưới") for Minh & Hiếu, dated 08.11.2026. This project is not intended to be reused, forked, or turned into a template. There is no need for generalization, abstraction, or configurability beyond what serves this single wedding.

Originally a handoff bundle from Claude Design (HTML/CSS/JS prototypes), now migrated to a production React + Vite + Supabase build in the `app/` directory.

## IMPORTANT: Active Codebase

**The production app lives in `app/`** — a React + Vite + Supabase build. **All code changes MUST be made in `app/src/`.**

The `project/` directory is the **old prototype** (CDN React + Babel standalone). It is NOT used by `npm run dev`. **Never edit files in `project/` for production changes.**

## Key Entry Point

Start from `app/src/App.jsx`, then explore `app/src/components/` and `app/src/hooks/`.

## Architecture

React 18 + Vite SPA with Supabase backend:

- `app/src/main.jsx` — Entry point, renders `<App />`
- `app/src/App.jsx` — Root component. Section flow: **Gate → Details → Family (Groom) → Family (Bride) → WeddingInfo → Timeline → RSVP → Footer**
- `app/src/components/` — One component per section file
- `app/src/hooks/` — Custom hooks (useSiteConfig, useMedia, useReveal, useCountdown)
- `app/src/lib/` — Supabase client, config helpers, placeholders
- `app/src/styles/globals.css` — CSS variables, resets, typography, lightbox
- `app/src/styles/sections.css` — Per-section styling, animations, responsive breakpoints

### Component Map

| Component | File | Purpose |
|-----------|------|---------|
| `GateHero` | `GateHero.jsx` | Opening doors animation, tap-to-open |
| `Details` | `Details.jsx` | Save-the-date, horizontal photo carousel |
| `Family` | `Family.jsx` | Reused for both groom and bride sides (prop `side`) |
| `WeddingInfo` | `WeddingInfo.jsx` | Formal invitation card with map/phone CTAs |
| `Timeline` | `Timeline.jsx` | Event schedule + live countdown timer |
| `RSVP` | `RSVP.jsx` | Attendance confirmation form |
| `Nav` | `Nav.jsx` | Sticky nav, appears after gate opens; music toggle |
| `Footer` | `Footer.jsx` | Simple closing |
| `MediaImage` | `MediaImage.jsx` | Image component with Supabase fallback chain + lightbox |
| `Lightbox` | `Lightbox.jsx` | Full-screen photo overlay (context provider) |

### Data & Config

Wedding details are loaded from Supabase via `useSiteConfig()`. Family members, timeline events, and media are fetched from Supabase tables and storage.

## Assets

- `app/public/assets/` — Medallion images (gold, ink variants)
- Media images served from Supabase Storage with placeholder fallbacks
- Photo placeholders use `<div className="ph" data-label="...">` when no image is available

## Design Tokens (from globals.css)

- Fonts: `--serif` (Cormorant Garamond), `--sans` (Inter), `--mono` (JetBrains Mono)
- Primary palette: `--paper` (#FDF7F7), `--ink` (#6B5E5B), `--rose` (#B58285), `--sage` (#9CAEA9)
- Legacy aliases exist: `--gold` → `--rose`, `--burgundy` → `--rose-deep`
- Language: Bilingual Vietnamese/English throughout

## Running Locally

```bash
cd app
npm run dev
```

## Implementation Notes

- Scroll-reveal animations use `IntersectionObserver` via the `useReveal()` hook (class `.reveal` → `.in`)
- The gate opening animation uses CSS transforms on `.gate-door-l` / `.gate-door-r`
- `MediaImage` component handles image fallback chain: Supabase URL → local fallback → placeholder URL → `.ph` div
- Lightbox uses React Context (`LightboxProvider` in App.jsx) — all `MediaImage` instances are clickable by default
