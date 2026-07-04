# PRD — "Shrtly" URL Shortener

A tiny URL shortener to exercise the full agent team: it has real backend logic
(QA backend mode) and a real UI (designer → developer → QA screenshot mode).

## Problem

Sharing long URLs is ugly. Users want to paste a long URL and get a short link
that redirects to the original.

## Scope (v1)

### Functional requirements

1. **Shorten**: `POST /api/shorten` with JSON `{ "url": "<long-url>" }` returns
   `{ "code": "<6-char-code>", "shortUrl": "http://localhost:3000/<code>" }`.
   - Valid `http`/`https` URLs only; anything else returns `400` with
     `{ "error": "invalid_url" }`.
   - Shortening the same URL twice returns the same code (idempotent).
2. **Redirect**: `GET /<code>` responds `302` to the original URL.
   Unknown codes return `404` with a friendly not-found page.
3. **Stats**: `GET /api/stats/<code>` returns `{ "url", "code", "clicks" }`.
   Each successful redirect increments `clicks`.
4. **Persistence**: links survive a server restart (SQLite or a JSON file is fine).

### UI requirements

A single page at `/`:

- Centered card layout, max width 480px, on a soft neutral background.
- App name "Shrtly" as the heading, with the tagline "Long links, short life."
- One text input (placeholder: `Paste a long URL…`) + a primary button `Shorten`.
- On success: show the short URL below the form with a `Copy` button;
  clicking Copy puts the short URL on the clipboard and flashes "Copied!".
- On invalid URL: show an inline error message under the input
  (`That doesn't look like a valid URL`), input border turns red.
- Empty input + click Shorten: button does nothing (disabled state).
- Responsive: usable at 375px (mobile), 768px (tablet), 1280px (desktop) widths.

### Non-functional

- Node.js (any minimal framework — Express is fine) or equivalent; no auth.
- Codes are URL-safe `[a-zA-Z0-9]{6}` and collision-checked.
- All backend behavior above must be covered by automated tests.

## Out of scope (v1)

Custom aliases, accounts, link expiry, analytics dashboards, rate limiting.

## Acceptance

The feature is done when every requirement above has a QA_PASSED verdict in the
feature's MAPPING.md — backend via executed test cases, UI via screenshots at
the three widths compared against the design spec.
