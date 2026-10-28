# Lesson 4 · Async, HTTP & fetch

“Waiting, without freezing.” **≈116 minutes of core material** (50 slides, 13 of them optional
for +36 minutes), including a 5-minute break. The first half is a lecture where the room
predicts and reasons out loud. The second half is hands-on: everyone uses `curl` on a real
server running in the room.

| Block | Time | What |
| --- | --- | --- |
| Intro | 3 min | the hook puzzle (solved in “Promise vs setTimeout”), predict → pair → vote → step through, the map |
| **01 · The engine** | 17 min | latency, one thread (freeze demo), stack & heap + closures, the whole machine, `setTimeout(…, 0)`, the `var` loop puzzle (`let` fix ·opt) |
| **02 · Promises & await** | 18 min | a promise is an object, promise vs timer, async/await syntax, `await` pauses one function, the final boss, sequential vs `Promise.all` (errors ·opt, forgotten await ·opt, checkpoint ·opt) |
| Break | 5 min | everyone opens a terminal and runs `curl --version`; the teacher starts the server |
| **03 · HTTP** | 16 min | what an API is (try GitHub in the address bar), request/response anatomy, the verbs, safe & idempotent, status codes (reading docs ·opt) |
| **04 · curl lab** | 27 min | install curl, first requests, six flags, the class server's docs, Lab 1 (GET + POST), Lab 2 (PATCH, PUT, DELETE, 401 vs 403), system design recap (Lab 3 ·opt, design likes ·opt) |
| **05 · fetch** | 22 min | fetch and the 404 surprise, every curl is a fetch, one helper for every verb, race conditions, fetching in React, CORS & keys (event loop trace, Pokédex demo, higher-level APIs, N + 1 ·opt) |
| **06 · Pages recap** | 4 min | pages and routes in one slide, refresh 404s and in-page nav |
| Wrap-up | 4 min | exit ticket, homework (rules ·opt, cheat sheet ·opt) |

It combines the original lesson 4 deck, the 40-minute cut, and the team's *Public APIs*,
*Pages*, and *System Design Recap* slides. The pages and system design material is cut down to a
recap. System design comes up again where it fits best: after the lab, applied to the server
students just poked at (“You skipped the frontend. The rules held.”).

## The class server

`server/` is a small guestbook API with no dependencies. It has every verb, real status codes
(200 201 204 400 401 403 404 405 415 429), per-entry edit tokens, and a few practice endpoints
(`/echo`, `/status/:code`, `/slow`).

```sh
node lesson4/server/server.js                       # port 3000
PORT=4000 node lesson4/server/server.js
POSTS_PER_MINUTE=60 node lesson4/server/server.js   # if the whole class shares one IP
```

- It prints a **Same Wi-Fi** address. Students set `API=http://<that address>:3000` and use
  `"$API/entries"` in every command.
- Open that address in a browser and put it on the projector. The **live view** shows the
  entries and every request as it arrives. The terminal logs them too, including the browser's
  CORS preflight `OPTIONS` requests when the slides use `fetch`.
- Data lives in memory. Restarting the server resets the guestbook and every token.
- **Some Wi-Fi blocks laptops from reaching each other.** Check with a phone before class. Plan
  B: every student runs their own copy (they have Node from lesson 3) and uses
  `API=http://localhost:3000`.
- `GET /` with curl prints the endpoint list. The slide “Meet the class server” is the same list.

`server/guestbook.js` holds all the rules. `server.js` wraps it in Node's `http` module, and
the deck loads the same file in the browser for the offline copy.

## Teaching it

- **PREDICT slides** (orange numbers in the sidebar) open frozen at step 0. Use the think
  timer, let pairs argue, take a vote, then step through.
- **→ / Space / a clicker steps the trace first**, then moves to the next slide. ← steps back.
- **Teacher notes** are under every slide: SAY, ASK, ANSWER, COMMON WRONG ANSWER, IF STUCK, DO.
- **Speaker view**: press **S**. A second window shows the notes, what's next, a clock, and an
  elapsed timer. Put the main window on the projector and press **Present**.
- Blue **TALK** boxes are open questions. Take two or three answers and move on.
- **Windows:** use Git Bash for the lab. In PowerShell, `curl` is a different command
  (`curl.exe` is the real one), and Windows PowerShell strips the quotes out of JSON bodies.
  The server's error message says so if it happens.
- **No Wi-Fi?** Any fetch slide has a **network: live / offline copy** switch. The offline copy
  answers PokeAPI, JSONPlaceholder, and class-server requests (any `localhost` or private
  network address) with a realistic delay, using the same guestbook rules.

## Running the slides

Serve the repo root and open `/lesson4/`:

```sh
python3 -m http.server 8000
```

Opening `index.html` directly also works, except the speaker view, which needs both windows
on the same origin.

## Editing

- Slides are `<template>` elements in `index.html` (`data-part`, `data-title`, `data-time`,
  `data-label`; add `data-optional` to mark a slide skippable).
- `<div data-predict="60">question</div>` draws the predict banner with a 60 s timer.
- `<div data-trace="name"></div>` draws a step-through from `traces.js`. If you edit a trace's
  code, make sure its `log` steps still match what the code really prints.
- `<script type="text/plain" data-run>` is editable, runnable JS with a timestamped console
  (top-level `await` works). Add `data-net` for the network switch and `data-mark="2-4"` to
  highlight lines. Without `data-run` it's read-only (`data-label` names it).
- `<div class="term">` is a terminal block: `<span class="p">$</span>` for the prompt,
  `.c` for comments, `.o` for output. `<ol class="steps">` numbers lab steps;
  `<span class="expect">201</span>` marks the expected status.
- `<div data-freeze>` is the blocking demo, `<div data-poke>` the Pokédex demo.
- `.quiz` blocks: `data-ok` on the right button, `data-why` on every button. `data-reveal` on a
  button toggles the `.answer` after it.
- `runner.js` is the highlighter, the runner, and the offline fetch copy; `deck.js` is
  navigation, the visualizer, the demos, and the speaker view.
