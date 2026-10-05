(() => {
  // The game and its current state live in this browser page.
  const ROWS = 9;
  const COLUMNS = 9;
  const MINE_TOTAL = 10;

  const boardElement = document.getElementById('board');
  const statusElement = document.getElementById('gameStatus');
  const mineCountElement = document.getElementById('mineCount');
  const timerElement = document.getElementById('timer');
  const resetButton = document.getElementById('resetGame');

  let cells = [];
  let hasStarted = false;
  let hasFinished = false;
  let flagCount = 0;
  let revealedSafeCells = 0;
  let seconds = 0;
  let timerId = null;

  function makeCell(row, column) {
    return {
      r: row,
      c: column,
      mine: false,
      count: 0,
      revealed: false,
      flagged: false
    };
  }

  // Make a fresh 2D array: cells[row][column].
  function createEmptyBoard() {
    return Array.from({length: ROWS}, (_, row) =>
      Array.from({length: COLUMNS}, (_, column) => makeCell(row, column))
    );
  }

  function startNewGame() {
    clearInterval(timerId);
    hasStarted = false;
    hasFinished = false;
    flagCount = 0;
    revealedSafeCells = 0;
    seconds = 0;
    cells = createEmptyBoard();

    drawBoard();
    updateCounters();
    setStatus('Choose a square. Your first click is safe.');
    resetButton.textContent = '🙂';
  }

  // Return the up-to-eight squares touching this cell, including diagonals.
  function getNeighbors(cell) {
    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
        if (rowOffset === 0 && columnOffset === 0) continue;

        const row = cell.r + rowOffset;
        const column = cell.c + columnOffset;
        const insideBoard =
          row >= 0 && row < ROWS && column >= 0 && column < COLUMNS;

        if (insideBoard) neighbors.push(cells[row][column]);
      }
    }
    return neighbors;
  }

  // Place mines only after the first reveal so that the first square is safe.
  function placeMines(safeCell) {
    const candidates = cells.flat().filter(cell => cell !== safeCell);

    // Shuffle the candidate locations, then take the first ten.
    for (let index = candidates.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swapIndex]] =
        [candidates[swapIndex], candidates[index]];
    }

    candidates.slice(0, MINE_TOTAL).forEach(cell => {
      cell.mine = true;
    });

    // Once the mines exist, each safe square can count its neighbors.
    countNearbyMines();
  }

  function countNearbyMines() {
    cells.flat().forEach(cell => {
      cell.count = getNeighbors(cell).filter(neighbor => neighbor.mine).length;
    });
  }

  // Turn game data into 81 real browser buttons.
  function drawBoard() {
    boardElement.replaceChildren();

    cells.flat().forEach(cell => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.setAttribute('role', 'gridcell');
      button.dataset.row = cell.r;
      button.dataset.column = cell.c;
      button.setAttribute(
        'aria-label',
        'Row ' + (cell.r + 1) + ', column ' + (cell.c + 1) + ', covered'
      );

      button.addEventListener('click', event => {
        if (event.shiftKey) toggleFlag(cell);
        else revealCell(cell);
      });
      button.addEventListener('contextmenu', event => {
        event.preventDefault();
        toggleFlag(cell);
      });

      boardElement.append(button);
    });
  }

  function buttonFor(cell) {
    return boardElement.querySelector(
      '[data-row="' + cell.r + '"][data-column="' + cell.c + '"]'
    );
  }

  // Draw one square according to its current data.
  function drawCell(cell) {
    const button = buttonFor(cell);
    button.className = 'cell';
    button.textContent = '';

    if (cell.revealed && cell.mine) {
      button.classList.add('revealed', 'mine');
      button.textContent = '✹';
      button.setAttribute('aria-label', 'Mine');
      return;
    }

    if (cell.flagged) {
      button.classList.add('flagged');
      button.textContent = '⚑';
      button.setAttribute('aria-label', 'Flagged square');
      return;
    }

    if (!cell.revealed) {
      button.setAttribute('aria-label', 'Covered square');
      return;
    }

    button.classList.add('revealed');
    button.disabled = true;

    if (cell.count > 0) {
      button.classList.add('n' + cell.count);
      button.textContent = cell.count;
      button.setAttribute('aria-label', cell.count + ' nearby mines');
    } else {
      button.setAttribute('aria-label', 'Empty square');
    }
  }

  function updateCounters() {
    const remainingMines = Math.max(0, MINE_TOTAL - flagCount);
    mineCountElement.textContent = String(remainingMines).padStart(3, '0');
    timerElement.textContent = String(seconds).padStart(3, '0');
  }

  function setStatus(message) {
    statusElement.textContent = message;
  }

  function startTimer() {
    timerId = setInterval(() => {
      seconds++;
      updateCounters();
    }, 1000);
  }

  // A reveal click reads one cell, changes its data, and redraws it.
  function revealCell(cell) {
    if (hasFinished || cell.flagged || cell.revealed) return;

    if (!hasStarted) {
      hasStarted = true;
      placeMines(cell);
      startTimer();
    }

    if (cell.mine) {
      finishGame(false);
      return;
    }

    if (cell.count === 0) {
      revealEmptyArea(cell);
    } else {
      cell.revealed = true;
      revealedSafeCells++;
      drawCell(cell);
    }

    checkForWin();
  }

  // When a square has zero nearby mines, reveal the connected empty area.
  function revealEmptyArea(startCell) {
    const cellsToCheck = [startCell];

    while (cellsToCheck.length > 0) {
      const cell = cellsToCheck.pop();

      if (cell.revealed || cell.flagged || cell.mine) continue;

      cell.revealed = true;
      revealedSafeCells++;
      drawCell(cell);

      if (cell.count === 0) {
        getNeighbors(cell).forEach(neighbor => {
          if (!neighbor.revealed) cellsToCheck.push(neighbor);
        });
      }
    }
  }

  function toggleFlag(cell) {
    if (hasFinished || cell.revealed) return;

    if (!cell.flagged && flagCount >= MINE_TOTAL) {
      setStatus('All flags are placed. Remove one before placing another.');
      return;
    }

    cell.flagged = !cell.flagged;
    flagCount += cell.flagged ? 1 : -1;
    drawCell(cell);
    updateCounters();
  }

  function checkForWin() {
    const safeCellTotal = ROWS * COLUMNS - MINE_TOTAL;
    if (revealedSafeCells === safeCellTotal) finishGame(true);
  }

  function finishGame(won) {
    hasFinished = true;
    clearInterval(timerId);

    if (won) {
      resetButton.textContent = '😎';
      setStatus('You found every safe square. You win!');
      return;
    }

    cells.flat().filter(cell => cell.mine).forEach(cell => {
      cell.revealed = true;
      drawCell(cell);
    });
    resetButton.textContent = '😵';
    setStatus('Mine hit. Start a new game and try again.');
  }

  resetButton.addEventListener('click', startNewGame);
  startNewGame();
})();
