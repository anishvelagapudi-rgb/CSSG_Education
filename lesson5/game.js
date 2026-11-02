/* Lesson 5 · "Merge Conflict": a two-team quiz for the projector.
   Teams take turns. Right answer = 100 + speed bonus. Wrong or out of time = the other team can steal for 50. */
(() => {
  const QUESTIONS = [
    { q: 'You want a copy of a project from GitHub on your laptop for the first time.', a: 'git clone <url>', w: ['git pull', 'git init', 'git push <url>'],
      e: '<code>clone</code> downloads the whole repo and its history, once. After that you use <code>pull</code> to get new changes.' },
    { q: 'You changed index.html. Before you commit, Git needs to know you want it in the next snapshot.', a: 'git add index.html', w: ['git commit index.html', 'git push index.html', 'git save index.html'],
      e: '<code>git add</code> puts the change in the staging area, the box for your next commit.' },
    { q: 'Your changes are staged. Save the snapshot with a message.', a: 'git commit -m "add navbar"', w: ['git push -m "add navbar"', 'git add -m "add navbar"', 'git save "add navbar"'],
      e: 'A commit is a saved snapshot on <b>your laptop</b>. Nobody else sees it until you push.' },
    { q: 'Your teammate just pushed a fix to GitHub. Get it onto your laptop.', a: 'git pull', w: ['git push', 'git clone', 'git commit'],
      e: '<code>pull</code> = download new commits from GitHub and merge them into your branch.' },
    { q: 'You made 3 commits. Your teammates can\'t see them yet. Fix that.', a: 'git push', w: ['git pull', 'git commit --share', 'git add .'],
      e: '<code>push</code> uploads your commits to GitHub.' },
    { q: 'You forgot what you changed and what is staged. Which command shows you?', a: 'git status', w: ['git log', 'git check', 'git branch'],
      e: '<code>git status</code> is the "where am I?" command. Run it constantly; it is always safe.' },
    { q: 'You want to try a risky new feature without touching main.', a: 'git switch -c new-feature', w: ['git commit -b new-feature', 'git clone new-feature', 'git merge new-feature'],
      e: '<code>switch -c</code> creates a branch and moves you onto it. (Older way: <code>git checkout -b</code>.)' },
    { q: 'git push says: "rejected — the remote contains work that you do not have locally". What do you do?', a: 'git pull, then git push', w: ['git push --force', 'Delete the repo and clone again', 'git commit again'],
      e: 'Someone pushed before you. Pull their work, merge it, then push. <code>--force</code> would erase their commits.' },
    { q: 'You want to see the history of commits, one per line.', a: 'git log --oneline', w: ['git status', 'git history', 'git diff'],
      e: '<code>git log</code> shows commits newest first. <code>--oneline</code> keeps it short.' },
    { q: 'After a pull, your file contains <<<<<<< HEAD … ======= … >>>>>>>. What is going on?', a: 'Merge conflict: edit, add, commit', w: ['Git is broken: reinstall it', 'Your file got corrupted', 'Run git push --force'],
      e: 'You and a teammate changed the same lines. Pick the right version, delete the markers, then <code>git add</code> and <code>git commit</code>.' },
    { q: 'You are on main. Bring the finished work from the branch "navbar" into main.', a: 'git merge navbar', w: ['git pull navbar', 'git switch navbar', 'git push navbar'],
      e: '<code>git merge &lt;branch&gt;</code> brings that branch\'s commits into the branch you are on.' },
    { q: 'Alice edits style.css. Bob edits about.html. Both push. Will there be a conflict?', a: 'No: Git merges it automatically', w: ['Yes, always', 'Yes, whoever pushes second loses', 'Only if they used different branches'],
      e: 'Conflicts only happen when two people change the <b>same lines</b> of the same file (or one deletes a file the other edits).' },
    { q: 'You see exactly what you changed in your files, line by line, before staging.', a: 'git diff', w: ['git status', 'git log', 'git show-all'],
      e: '<code>git diff</code> shows unstaged changes. <code>git diff --staged</code> shows what is about to be committed.' },
    { q: 'You ran git commit but forgot git add. What gets committed?', a: 'Only what was already staged', w: ['Every changed file', 'Nothing; Git deletes your changes', 'The whole folder'],
      e: 'Commit takes what is in the staging box. Unstaged edits stay in your working directory, safe but not saved.' },
    { q: 'Which one is the best commit message?', a: '"Fix login button on mobile"', w: ['"stuff"', '"asdfgh"', '"changes 2 final FINAL"'],
      e: 'Future you (and your team) will read <code>git log</code>. Say what changed and why, in a few words.' },
    { q: 'Where does a commit live right after you run git commit?', a: 'Only on your laptop', w: ['On GitHub', 'On your teammate\'s laptop', 'Nowhere until you push'],
      e: 'It is saved for real, just locally. <code>push</code> is what shares it.' }
  ];

  const root = document.getElementById('gameRoot');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let g = null;     // game state
  let timer = null;

  function setup() {
    clearInterval(timer);
    root.innerHTML =
      '<div class="game-setup">' +
      '<p class="lead" style="margin:0">Split the room into two teams. Teams take turns answering. Get it right fast for up to <b>150</b> points. Get it wrong (or run out of time) and the other team can <b>steal</b> for 50.</p>' +
      '<div class="team-inputs"><label>Team 1<input id="t0" value="Team Push" maxlength="20"></label><label>Team 2<input id="t1" value="Team Pull" maxlength="20"></label></div>' +
      '<div class="team-inputs"><label>Questions<select id="qcount"><option value="6">6 · about 3 min</option><option value="10" selected>10 · about 5 min</option><option value="' + QUESTIONS.length + '">All ' + QUESTIONS.length + '</option></select></label>' +
      '<label>Time per question<select id="qtime"><option value="15">15 s</option><option value="20" selected>20 s</option><option value="30">30 s</option></select></label></div>' +
      '<div><button class="next-button" id="startGame" style="height:46px;font-size:15px">Start the game →</button></div>' +
      '<p class="hint" style="margin:0">Keys: <b>1–4</b> pick an answer · <b>Enter</b> next question. The teacher (or a student "driver") clicks for the team.</p>' +
      '</div>';
    root.querySelector('#startGame').addEventListener('click', () => {
      g = {
        names: [root.querySelector('#t0').value.trim() || 'Team 1', root.querySelector('#t1').value.trim() || 'Team 2'],
        scores: [0, 0],
        qs: shuffle(QUESTIONS).slice(0, +root.querySelector('#qcount').value),
        time: +root.querySelector('#qtime').value,
        i: 0, turn: 0
      };
      question();
    });
  }

  function question() {
    const q = g.qs[g.i];
    g.phase = 'answer';
    g.active = (g.i % 2);       // alternate who goes first
    g.opts = shuffle([q.a].concat(q.w));
    root.innerHTML =
      '<div class="scoreboard">' +
      [0, 1].map(t => '<div class="score t' + t + '"><div><div class="name">' + esc(g.names[t]) + '</div><div class="turn-tag">YOUR TURN</div></div><div class="pts">' + g.scores[t] + '</div></div>').join('<div class="qnum">Q ' + (g.i + 1) + ' / ' + g.qs.length + '</div>') +
      '</div>' +
      '<div class="timer"><div></div></div>' +
      '<p class="scenario">' + esc(q.q) + '</p>' +
      '<div class="scenario-sub"></div>' +
      '<div class="options">' + g.opts.map((o, k) => '<button class="opt" data-k="' + k + '"><span class="k">' + (k + 1) + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>' +
      '<div class="explain" hidden></div>' +
      '<div class="game-foot"><button class="arrow-button" id="quitGame">End game</button><button class="next-button" id="nextQ" hidden>Next question →</button></div>';
    root.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => pick(+b.dataset.k)));
    root.querySelector('#nextQ').addEventListener('click', advance);
    root.querySelector('#quitGame').addEventListener('click', finish);
    turnUI();
    startTimer(g.time);
  }

  function turnUI() {
    root.querySelectorAll('.score').forEach((s, t) => s.classList.toggle('turn', t === g.active && g.phase !== 'reveal'));
    const sub = root.querySelector('.scenario-sub');
    sub.className = 'scenario-sub' + (g.phase === 'steal' ? ' steal' : '');
    sub.textContent = g.phase === 'steal' ? 'STEAL! ' + g.names[g.active] + ', you can take it for 50 points.' : g.phase === 'answer' ? g.names[g.active] + ', you\'re up.' : '';
  }

  function startTimer(seconds) {
    clearInterval(timer);
    const bar = root.querySelector('.timer');
    const fill = bar.firstElementChild;
    const end = Date.now() + seconds * 1000;
    g.deadline = end; g.span = seconds * 1000;
    bar.classList.remove('low');
    fill.style.width = '100%';
    timer = setInterval(() => {
      const left = end - Date.now();
      fill.style.width = Math.max(0, left / (seconds * 1000) * 100) + '%';
      bar.classList.toggle('low', left < 5000);
      if (left <= 0) { clearInterval(timer); miss(null); }
    }, 100);
  }

  function pick(k) {
    if (g.phase === 'reveal') return;
    const btn = root.querySelector('.opt[data-k="' + k + '"]');
    if (!btn || btn.disabled) return;
    const q = g.qs[g.i];
    if (g.opts[k] === q.a) {
      clearInterval(timer);
      const bonus = g.phase === 'answer' ? Math.round(50 * Math.max(0, g.deadline - Date.now()) / g.span) : 0;
      const pts = g.phase === 'answer' ? 100 + bonus : 50;
      g.scores[g.active] += pts;
      reveal(g.names[g.active] + ' +' + pts + (bonus ? ' (incl. ' + bonus + ' speed bonus)' : ''));
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      miss(k);
    }
  }

  function miss() {
    if (g.phase === 'answer') {
      g.phase = 'steal';
      g.active = 1 - g.active;
      turnUI();
      startTimer(Math.max(8, Math.round(g.time / 2)));
    } else {
      clearInterval(timer);
      reveal('No points this round.');
    }
  }

  function reveal(headline) {
    g.phase = 'reveal';
    const q = g.qs[g.i];
    root.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (g.opts[+b.dataset.k] === q.a) b.classList.add('right'); });
    root.querySelectorAll('.score .pts').forEach((p, t) => (p.textContent = g.scores[t]));
    const ex = root.querySelector('.explain');
    ex.hidden = false;
    ex.innerHTML = '<b>' + esc(headline.toUpperCase()) + '</b>' + q.e;
    const nb = root.querySelector('#nextQ');
    nb.hidden = false;
    nb.textContent = g.i === g.qs.length - 1 ? 'See who won →' : 'Next question →';
    nb.focus();
    turnUI();
  }

  function advance() {
    g.i++;
    if (g.i >= g.qs.length) finish();
    else question();
  }

  function finish() {
    clearInterval(timer);
    const [a, b] = g.scores;
    const head = a === b ? 'It\'s a tie. Merge both teams!' : (a > b ? g.names[0] : g.names[1]) + ' wins!';
    root.innerHTML =
      '<div class="final"><div class="eyebrow">FINAL SCORE</div><p class="big">' + esc(head) + '</p>' +
      '<p class="lead" style="margin:0 auto 22px">' + esc(g.names[0]) + ' <b>' + a + '</b> · ' + esc(g.names[1]) + ' <b>' + b + '</b></p>' +
      '<button class="next-button" id="again">Play again</button></div>';
    root.querySelector('#again').addEventListener('click', setup);
    g = null;
    confetti();
  }

  function confetti() {
    const layer = document.createElement('div');
    layer.className = 'confetti';
    const colors = ['#52775f', '#42647c', '#965d35', '#a74e48', '#8a6d1f'];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      p.style.animationDelay = Math.random() * .6 + 's';
      layer.append(p);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 4500);
  }

  document.addEventListener('keydown', e => {
    if (document.getElementById('gameMode').hidden || !g) return;
    if (/INPUT|SELECT/.test(e.target.tagName)) return;
    if (/^[1-4]$/.test(e.key)) pick(+e.key - 1);
    else if (e.key === 'Enter' && g.phase === 'reveal') { e.preventDefault(); advance(); }
  });

  setup();
})();
