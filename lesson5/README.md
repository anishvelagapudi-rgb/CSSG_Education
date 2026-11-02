# Lesson 5 · Git Revisited (20 min)

A refresher on Git: where your code lives after each command, branches, and what happens when
several people push to the same repo. Every diagram can be clicked, and the lesson ends with a two-team class game.

| Block | Time | Slides |
| --- | --- | --- |
| Intro | 1 min | Git's two jobs + the whole lesson in 6 commands |
| **01 · Solo** | ~8 min | the four places (interactive), the ~10 commands (flip cards), commits & branches (live git sandbox) |
| **02 · Teams** | ~7 min | Alice & Bob step-through (push rejected → pull → merge), conflict or not? (vote), fix a merge conflict (hands on), branch → PR → merge workflow |
| **03 · Play** | ~4 min | *Merge Conflict* team game + exit ticket |

## Tabs

- **Slides**: the lesson. `→`/`←` move (on the Alice & Bob slide `→` steps the demo first), `F` presents full screen. Teacher notes are under each slide.
- **Sandbox**: a fake in-browser Git (`commit`, `branch`, `switch`/`checkout`, `merge`, `log`, `branch -d`) with a live commit graph and self-checking challenges. Nothing typed there touches a real repo.
- **Game**: two teams take turns answering real-world Git situations. 100 points + up to 50 speed bonus; wrong or out of time lets the other team steal for 50. Keys `1`–`4` answer, `Enter` goes to the next question.

## Files

- `index.html`: shell + slide templates (`<template data-part data-title data-time>`)
- `deck.js`: slide engine and the diagrams (four places, Alice & Bob, conflict resolver)
- `gitsim.js`: the fake Git + commit-graph renderer
- `game.js`: the class game (questions are at the top of the file)

## Running it

Serve the repo root and open `/lesson5/`:

```sh
python3 -m http.server 8000
```
