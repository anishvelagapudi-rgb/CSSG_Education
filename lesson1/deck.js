(() => {
  const templates = [...document.querySelectorAll('#slideTemplates template')];
  const dependencySlide = document.createElement('template');
  dependencySlide.dataset.title = 'What does npm install do?';
  dependencySlide.dataset.time = '3 MIN';
  dependencySlide.dataset.label = 'SETUP 02 · DEPENDENCIES';
  dependencySlide.innerHTML = '<div class="eyebrow">ONE PROJECT CAN USE OTHER PEOPLE’S CODE</div><h2>A dependency is a <span class="accent">helper package</span>.</h2><p>Node.js includes npm, a package manager. It reads the project’s list, downloads the needed package, and puts it in the project folder.</p><div class="program-path"><div><b>package.json</b><small>project’s shopping list</small></div><i>→</i><div><b>npm install</b><small>download listed packages</small></div><i>→</i><div><b>node_modules</b><small>local package files</small></div></div><div class="code-card"><div class="code-head">This workshop’s helper</div><pre>http-server · serves our pages in a browser\nnpm start · starts that local server</pre></div><div class="one-line">The Minesweeper game itself uses plain HTML, CSS, and JavaScript. This extra package only helps us preview the workshop pages.</div>';
  const toolboxIndex = templates.findIndex(template => template.dataset.title === 'What are we installing?');
  templates.splice(toolboxIndex + 1, 0, dependencySlide);
  const labelUpdates = {
    'Meet the terminal': 'FOUNDATIONS 05 · TERMINAL',
    'What happens when a page opens?': 'FOUNDATIONS 06 · BROWSER',
    'Where do I write the code?': 'FOUNDATIONS 07 · WORKSPACE',
    'Three jobs on a webpage': 'FOUNDATIONS 08 · FRONTEND',
    'Run a first program': 'FOUNDATIONS 09 · FIRST RUN',
    'Now we have the map': 'FOUNDATIONS 10 · READY',
    'Install for your computer': 'SETUP 03 · INSTALL',
    'Check your installations': 'SETUP 04 · VERIFY'
  };
  templates.forEach(template => {
    if (labelUpdates[template.dataset.title]) template.dataset.label = labelUpdates[template.dataset.title];
  });
  const classSlide = document.createElement('template');
  classSlide.dataset.title = 'A class keeps game rules together';
  classSlide.dataset.time = '4 MIN';
  classSlide.dataset.label = 'GAME · OBJECT ORIENTED PROGRAMMING';
  classSlide.innerHTML = '<div class="eyebrow">A CLASS IS A BLUEPRINT FOR AN OBJECT</div><h2>One <span class="accent">Minesweeper</span> class owns the rules.</h2><div class="foundation-cards"><div><b>Class</b><p>The recipe: what one game remembers and what it can do.</p><code>class Minesweeper { ... }</code></div><div><b>Object</b><p>One actual game made from that recipe.</p><code>const game = new Minesweeper();</code></div><div><b>Method</b><p>An action the game knows how to do.</p><code>game.reveal(row, column);</code></div></div><div class="line-guide"><h3>Keep the boundary simple</h3><p>The class owns the board and rules. It does not create buttons or look up HTML. Page code calls a method after a click, then draws the updated game. This keeps game rules reusable outside the browser later.</p></div><div class="one-line">We can teach the class, object, and method as a small set of names for this pattern.</div>';
  const neighborIndex = templates.findIndex(template => template.dataset.title === 'Find the touching squares');
  templates.splice(neighborIndex, 0, classSlide);
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
    slide.querySelectorAll('[data-reveal]').forEach(button =>
      button.addEventListener('click', () => {
        document.getElementById(button.dataset.reveal).classList.toggle('show');
      }));
    const osButtons = [...slide.querySelectorAll('[data-os-choice]')];
    if (osButtons.length) {
      const agent = navigator.userAgent;
      const detectedOS = /Windows/i.test(agent) ? 'windows' : /Mac/i.test(agent) ? 'mac' : 'linux';
      function chooseOS(os) {
        osButtons.forEach(button => button.classList.toggle('selected', button.dataset.osChoice === os));
        slide.querySelectorAll('[data-os-panel]').forEach(panel => {
          panel.hidden = panel.dataset.osPanel !== os;
        });
      }
      osButtons.forEach(button => button.addEventListener('click', () => chooseOS(button.dataset.osChoice)));
      chooseOS(detectedOS);
    }
    const commandInput = slide.querySelector('#terminalCommand');
    if (commandInput) {
      let folder = 'workshop';
      const runCommand = () => {
        const command = commandInput.value.trim();
        const output = slide.querySelector('#terminalOutput');
        if (command === 'pwd') output.textContent = '/home/student/' + folder;
        else if (command === 'ls') output.textContent = folder === 'workshop'
          ? 'minesweeper/  README.md' : 'index.html (HTML, CSS, JavaScript)';
        else if (command === 'cd minesweeper' && folder === 'workshop') {
          folder = 'minesweeper';
          output.textContent = 'Moved into minesweeper. Try ls';
        } else if (command === 'cd ..' && folder === 'minesweeper') {
          folder = 'workshop';
          output.textContent = 'Moved up to workshop.';
        } else output.textContent = 'Try pwd, ls, cd minesweeper, or cd ..';
        commandInput.value = '';
      };
      slide.querySelector('#runTerminalCommand').addEventListener('click', runCommand);
      commandInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') runCommand();
      });
    }
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
    button.addEventListener('click', () => {
      if (button.dataset.mode === 'walkthrough') {
        window.location.href = 'minesweeper-walkthrough.html';
        return;
      }
      setMode(button.dataset.mode);
    }));

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
