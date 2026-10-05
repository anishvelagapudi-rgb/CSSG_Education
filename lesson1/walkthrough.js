(() => {
  const htmlInput = document.getElementById('htmlInput');
  const preview = document.getElementById('htmlPreview');
  function updatePreview() {
    preview.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{font:16px Arial,sans-serif;padding:18px;color:#203329}h1{font-size:24px}button{padding:8px 12px}</style>' + htmlInput.value;
  }
  htmlInput.addEventListener('input', updatePreview);
  updatePreview();

  document.getElementById('changeStyle').addEventListener('click', event => {
    const button = document.getElementById('styleButton');
    const changed = button.classList.toggle('bright');
    event.currentTarget.textContent = changed ? 'Change it back' : 'Try a different color';
  });

  let clicks = 0;
  document.getElementById('clickDemo').addEventListener('click', () => {
    clicks++;
    document.getElementById('clickMessage').textContent = `The button has been clicked ${clicks} ${clicks === 1 ? 'time' : 'times'}.`;
  });

  const cell = document.getElementById('cellDemo');
  cell.addEventListener('click', () => {
    cell.classList.toggle('open');
    const open = cell.classList.contains('open');
    cell.textContent = open ? '1' : '?';
    document.getElementById('cellMessage').textContent = open ? 'The data says: revealed. This square shows 1.' : 'The square is covered.';
  });
})();
