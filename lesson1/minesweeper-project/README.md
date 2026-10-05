# Minesweeper class project

There are two folders:

- `starter/` is the student project. It is one `index.html` file with HTML, CSS, and JavaScript together. Its board already opens safe squares.
- `completed/` is the finished one-file reference. Ask students to try a checkpoint before opening it.

## Start the student version

Run `npm install` once in the workshop folder, then `npm start`. Open <http://localhost:8000/minesweeper-project/starter/>. The game itself has no external packages; the workshop uses a small local server so the page works in every major browser.

## Checkpoint rhythm

After every change, save the file, refresh the page, and try the listed behavior. If something breaks, undo just the last change and try again. Each checkpoint builds on a working page.

1. **Done: open one safe square.** The `Minesweeper` class already updates one cell.
2. **Add known mines.** In `placeMines`, set `hasMine = true` on a few fixed cells. Try clicking a safe cell and then a mine.
3. **Count neighbors.** Finish `getNeighbors` and `countNumbers`. Check a corner, an edge, and the middle.
4. **Keep the first click safe.** Replace the fixed mine spots with random positions and skip the first clicked cell.
5. **Open empty areas.** Update `reveal` to open neighbors of a zero. Mark a cell open before checking its neighbors so it is not checked again and again.
6. **Add a win.** In `reveal`, compare the opened safe square count with the total safe squares. Show the win message when they match.
7. **Playtest.** Try corners, edges, mines, flags, reset, a win, and a loss. Explain which class data changed and what the page drew.

The game class stores the board and rules. Page code handles buttons and drawing. Keep new game rules in the class so they can later run on a server without needing browser elements.

The instructor can stop after any checkpoint. No one has to rush to finish all seven.
