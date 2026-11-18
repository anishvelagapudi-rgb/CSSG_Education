# Lesson 7 · Auth & Supabase RLS (~40 min, then project time)

How login works (tokens, signatures), how the backend checks a token, and how Row Level Security
makes Postgres enforce "you can only touch your own rows". About 40 minutes of teaching; the rest of class
is project time, using the Starter Code tab.

| Block | Time | Slides |
| --- | --- | --- |
| Intro | 2 min | your API today answers anyone |
| **01 · Auth** | ~18 min | authn vs authz (vote), login flow (step-through), inside a JWT (tamper demo), keys cheat sheet, frontend code, backend `requireUser` |
| **02 · RLS** | ~14 min | two locks + the side door, RLS playground (live), policy anatomy (click each line), spot the hole, wiring `supabaseAs` into Express |
| **03 · Play & Build** | ~7 min | *Access Denied* team game, then project time + exit check |

Running short? Skip “What's inside a token” and play 6 game questions instead of 10.

## Tabs

- **Slides**: the lesson. `→`/`←` move (on the login slide `→` steps the demo first), `F` presents full screen. Teacher notes are under each slide.
- **Policy Lab**: a fake `notes` table. Toggle RLS, pick a policy per command, switch between Not logged in / Alice / Bob / secret key, then edit, delete and insert. Shows the SQL for your choices; 7 self-checking challenges.
- **Game**: two teams answer auth/RLS situations. 100 points + up to 50 speed bonus; wrong or out of time lets the other team steal for 50. Keys `1`–`4`, `Enter` for next.
- **Starter Code**: step-by-step guide to add login + RLS to the class boilerplate, with every file (loaded from `starter/`), copy buttons, a two-user test checklist and a “when it breaks” list.

## Files

- `index.html`: shell, slide templates (`<template data-part data-title data-time>`), Lab/Game/Starter pages
- `deck.js`: slide engine, login-flow and JWT widgets, the RLS lab, starter-code loader
- `game.js`: the class game (questions are at the top)
- `starter/`: drop-in files for `boilerPlateEducationTeam` (see `Lesson 6 Bug Fixing/`)
  - `schema-notes.sql`: table with `user_id default auth.uid()`, RLS, grants, 4 policies
  - `backend/src/auth.js` (`requireUser`, uses `jose` + the JWKS URL), `supabase.js` (adds `supabaseAs(token)`), `routes/notes.js`, `index.js`
  - `frontend/src/supabase.ts`, `api.ts` (sends `Authorization: Bearer`), `AuthForm.tsx`, `AuthGate.tsx`, `main.tsx`, `App.tsx` (notes example)

The starter code was checked against a copy of the boilerplate: the frontend passes `tsc -b` and `vite build`, and the
backend was run against a local fake JWKS (no token / garbage / expired / tampered → 401; valid → the user's token is forwarded
to Supabase with the publishable key). It has not been run against a live Supabase project.

## Running it

Serve the repo root and open `/lesson7--FINAL/` (the Starter Code tab fetches files, so `file://` won't load them):

```sh
python3 -m http.server 8000
```
