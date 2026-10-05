# Minesweeper class implementation

This is the implementation contract for the frontend-only class project.
The class agrees on these rules before coding so everyone builds the same
game and can compare their work with the teacher copy.

## Project boundary

- Use plain HTML, CSS, and browser JavaScript.
- No framework, build tool, account, or external service.
- Student project files: `index.html`, `styles.css`, and `game.js`.
- The game state exists only in the current browser page. Reloading starts
  a new game; saving scores is outside this lesson.

## Agreed game rules

| Decision | Standard for class |
| --- | --- |
| Board | 9 rows × 9 columns |
| Mines | 10, placed randomly |
| First move | Always safe; place mines after the first reveal |
| Number | Count mines in all touching cells, including diagonals |
| Empty cell | Reveal its connected empty area and the numbered edge around it |
| Flag | Right-click or Shift-click a covered cell; at most 10 flags |
| Loss | Revealing a mine ends the round and shows the mines |
| Win | Reveal all 71 non-mine cells |
| Timer | Starts on the first reveal; stops when the round ends |
| New game | Reset button creates a fresh board and resets the timer |

The first click is safe, but it is not guaranteed to be an empty zero.
This keeps the randomization rule simple enough to explain and implement.

## Shared representation

The board is a two-dimensional array. Each cell is a small object:

```js
{
  r: 0, c: 0,
  mine: false,
  count: 0,
  revealed: false,
  flagged: false
}
```

`r` and `c` are zero-based row and column positions. The array is the game
state. HTML buttons are the visible controls drawn from that state. A click
changes the state, then the browser redraws the affected cells.

Each visible square is a `<button class="cell">`. Its `data-row` and
`data-column` attributes point back to the cell object. CSS classes describe
its appearance: `revealed`, `flagged`, `mine`, or `n1` through `n8`.

The teacher copy uses these function names to keep the walkthrough consistent:

- `makeCell` and `createEmptyBoard` create the data.
- `getNeighbors`, `placeMines`, and `countNearbyMines` prepare a round.
- `drawBoard` and `drawCell` translate data into buttons.
- `revealCell`, `revealEmptyArea`, and `toggleFlag` handle player actions.
- `checkForWin`, `finishGame`, and `startNewGame` handle round state.

## Build order

1. Agree on the rules above and sketch a sample board on paper.
2. Make the HTML shell and the 9 × 9 CSS grid.
3. Create cell data and a function that finds a cell's neighbors.
4. Place mines after the first click and calculate each cell's count.
5. Draw buttons from the cell data.
6. Handle reveal clicks, loss, and empty-area expansion.
7. Add flags, timer, win detection, and reset.
8. Play several rounds and fix the cases that fail.

The teacher demo uses `minesweeper.html`, `minesweeper.css`, and
`minesweeper.js`, and follows the same behavior contract. Students write
their own version in class and use the teacher copy to compare behavior
and implementation.
