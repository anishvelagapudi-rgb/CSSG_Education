# Lesson 4 · Async & fetch · the 40-minute cut

The bite-sized version of [lesson 4](../lesson4/). Same engine (traces, live code, the freeze
and Pokédex demos, speaker view, offline network copy), cut from ≈3 hours to **40 minutes of
core material** (21 slides, 5 of them optional for +10 minutes). The full deck in `../lesson4/`
is untouched.

| Block | Time | Slides |
| --- | --- | --- |
| Intro | 1 min | the hook puzzle + predict → pair → vote → step through |
| **01 · The engine** | ~15 min | latency, one thread (freeze demo), stack & heap + closures, the whole machine, `setTimeout(…, 0)`, the `var` loop puzzle (`let` fix ·opt) |
| **02 · Promises & await** | ~14 min | a promise is an object, promise vs timer (hook payoff), `await` pauses one function, the final boss, sequential vs `Promise.all` |
| **03 · The network** | ~8 min | HTTP in two minutes, fetch and the 404 surprise, race conditions (Pokédex demo ·opt, N + 1 ·opt) |
| Wrap-up | 2 min | exit ticket (rules ·opt, homework ·opt) |

## What changed from the full deck

- Short slides were merged: one thread + the freeze demo; stack, heap and closures on one slide;
  URL, request/response and status codes into “HTTP in two minutes”; first fetch + 404 into one
  live slide.
- Dropped for time: stack overflow, values vs references, GC & leaks, callback pyramids, the
  executor and two-chains traces, errors in `.then` chains, `wait(ms)`, the forgotten await,
  REST design table, JSON, two awaits, POST, React `useEffect`, network misbehavior, cheat sheet.
  All still in `../lesson4/`.
- Blue **TALK** boxes are open discussion questions. Take two or three answers and move on;
  suggested answers are in the teacher notes.
- Predict timers are shorter (30–60 s).
- Storage and window keys are `cssg-lesson4-short-*`, so the two decks don't share state.

## Running it

Serve the repo root and open `/lesson4-short/`:

```sh
python3 -m http.server 8000
```

See `../lesson4/README.md` for the controls and how to edit slides; this folder works the same.
