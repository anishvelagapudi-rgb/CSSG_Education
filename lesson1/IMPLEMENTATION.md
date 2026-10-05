# Minesweeper implementation contract

This is the shared plan for the class game and the completed reference.

## Project boundary

- One HTML file contains page markup, a `<style>` section, and a `<script>` section.
- The `Minesweeper` class owns the board data and game rules. It does not read or change HTML elements.
- Page code translates button clicks into class method calls, then renders the class state.
- The game uses no external packages. The workshop repository has a small `http-server` development dependency for previewing pages.
- Today the browser owns the game object. Later a server can own it and send the browser a safe view of the game.

## Agreed game rules

| Decision | Standard for class |
| --- | --- |
| Board | 9 rows × 9 columns |
| Mines | 10, placed randomly |
| First move | Always safe; place mines after the first reveal |
| Number | Count mines in all touching cells, including diagonals |
| Empty cell | Reveal its connected safe area and the numbered edge around it |
| Flag | Right-click or Shift-click a covered cell; at most 10 flags |
| Loss | Revealing a mine ends the round and shows the mines |
| Win | Reveal all 71 non-mine cells |
| Timer | Page-only display starts at first reveal and stops when the round ends |
| New game | Reset button asks the class to create a fresh board |

The first click is safe but is not guaranteed to be an empty zero.

## The class at a glance

A cell object stores its row, column, mine, number, open, and flagged values. The board is a two-dimensional array of those cells.

```js
class Minesweeper {
  newGame() { /* create a fresh board */ }
  getNeighbors(cell) { /* return touching cells */ }
  reveal(row, column) { /* apply reveal rules */ }
  toggleFlag(row, column) { /* apply flag rules */ }
}

const game = new Minesweeper();
const result = game.reveal(3, 4);
```

A class is a recipe for an object. The `game` object stores one round. Its methods are the actions allowed by the game rules.

## Keep the browser boundary visible

The class contains no `document`, button, CSS class, or browser event code. Page code listens for an event, calls `game.reveal(...)` or `game.toggleFlag(...)`, and draws the updated board. This boundary makes the rules reusable in a server program later. A server version would also need to avoid sending hidden mine locations to the browser.

## Build order

1. Agree on the game rules and sketch a board.
2. Put the HTML, CSS, and JavaScript in one `index.html` file.
3. Create the `Minesweeper` class and its cell data.
4. Find neighbors, place mines after the first click, and count clues.
5. Ask the class to reveal cells; let the page draw the result.
6. Add empty-area reveal, flags, win, loss, and reset.
7. Playtest corners, edges, and full rounds.

The playable teacher demo is `minesweeper.html`. The student starter and completed reference are in `minesweeper-project/`; each is a single HTML file.
