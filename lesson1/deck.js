(() => {
  const templates = [...document.querySelectorAll('#slideTemplates template')];
  const nav = document.getElementById('sectionNav');
  const slide = document.getElementById('slide');
  let current = 0;

  templates.forEach((template, index) => {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.innerHTML = '<span class="nav-number">' + String(index + 1).padStart(2, '0') +
      '</span><span>' + template.dataset.title + '</span><span class="nav-duration">' + template.dataset.time + '</span>';
    button.addEventListener('click', () => { current = index; render(); });
    nav.append(button);
  });

  function render() {
    const template = templates[current];
    document.getElementById('sectionLabel').textContent = template.dataset.label;
    document.getElementById('sectionTime').textContent = template.dataset.time;
    document.getElementById('slideIndex').textContent =
      'SLIDE ' + String(current + 1).padStart(2, '0') + ' / ' + templates.length;
    document.getElementById('routeCount').textContent =
      String(current + 1).padStart(2, '0') + ' / ' + templates.length;
    document.getElementById('progress').style.width =
      ((current + 1) / templates.length * 100) + '%';
    slide.replaceChildren(template.content.cloneNode(true));
    slide.className = 'fade-in';
    document.querySelectorAll('.nav-item').forEach((button, index) => {
      button.classList.toggle('active', index === current);
      if (index === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('prev').disabled = current === 0;
    document.getElementById('next').innerHTML = current === templates.length - 1
      ? 'Start activity <span>→</span>' : 'Next <span>→</span>';
    document.getElementById('main').scrollTop = 0;
    slide.querySelectorAll('[data-git-step]').forEach(button => {
      button.addEventListener('click', () => {
        const explanations = {
          edit: 'Edited file — Git sees it in your working directory.',
          stage: 'Staged — you selected this change for the next snapshot.',
          commit: 'Committed — the snapshot is in your local repository.',
          push: 'Pushed — the remote repository now has that commit.'
        };
        document.getElementById('gitState').textContent = explanations[button.dataset.gitStep];
      });
    });
    slide.querySelectorAll('[data-open-assignment]').forEach(button =>
      button.addEventListener('click', () => setMode('assignment')));
  }

  document.getElementById('prev').addEventListener('click', () => {
    if (current > 0) { current--; render(); }
  });
  document.getElementById('next').addEventListener('click', () => {
    if (current < templates.length - 1) { current++; render(); }
    else setMode('assignment');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.fullscreenElement &&
        document.body.classList.contains('presenting')) {
      document.body.classList.remove('presenting');
      syncPresentButton();
    }
    if (event.target.matches('textarea,input,select') ||
        document.getElementById('assignmentMode').hidden === false) return;
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      if (current < templates.length - 1) { current++; render(); }
    } else if (event.key === 'ArrowLeft' && current > 0) {
      current--; render();
    } else if (event.key === 'Home') {
      current = 0; render();
    } else if (event.key === 'End') {
      current = templates.length - 1; render();
    }
  });

  function setMode(mode) {
    const showSlides = mode === 'slides';
    document.getElementById('slidesMode').hidden = !showSlides;
    document.getElementById('assignmentMode').hidden = showSlides;
    document.querySelectorAll('.mode-tab').forEach(button =>
      button.classList.toggle('active', button.dataset.mode === mode));
    if (!showSlides) {
      if (document.fullscreenElement) document.exitFullscreen();
      document.body.classList.remove('presenting');
    }
  }
  document.querySelectorAll('.mode-tab').forEach(button =>
    button.addEventListener('click', () => setMode(button.dataset.mode)));

  const presentButton = document.getElementById('present');
  function syncPresentButton() {
    presentButton.innerHTML = document.body.classList.contains('presenting')
      ? '⛶ <span class="present-label">Exit</span>'
      : '⛶ <span class="present-label">Present</span>';
  }
  presentButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      document.body.classList.toggle('presenting');
      syncPresentButton();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    document.body.classList.toggle('presenting', Boolean(document.fullscreenElement));
    syncPresentButton();
  });

  document.getElementById('downloadEvidence').addEventListener('click', () => {
    const responses = {};
    document.querySelectorAll('[data-evidence]').forEach(field => {
      responses[field.dataset.evidence] = field.value.trim();
    });
    const blob = new Blob([JSON.stringify({
      workshop: 'Build a Web Game',
      savedAt: new Date().toISOString(),
      responses
    }, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'minesweeper-workshop-notes.json';
    link.click();
    URL.revokeObjectURL(url);
    document.getElementById('saveStatus').textContent = 'Your notes were downloaded.';
  });

  render();
})();
