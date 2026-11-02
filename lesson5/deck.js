/* Lesson 5 · Git Revisited. Slide engine + the interactive diagrams. */
(() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const store = {
    get(k) { try { return localStorage.getItem('cssg-lesson5-' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('cssg-lesson5-' + k, v); } catch (e) { /* private mode */ } }
  };
  const flash = (el, cls = 'flash') => { el.classList.remove('flash', 'bad'); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); };

  /* =========================================================
     Widget 1 · The four places a change lives
     ========================================================= */
  function placesDemo() {
    const FILES = ['index.html', 'style.css', 'app.js', 'README.md', 'about.html'];
    let n = 0;
    const id = () => String.fromCharCode(65 + (n++ % 26));
    const st = { working: [], staged: [], local: [{ l: id(), w: 'me' }], remote: [] };
    st.remote = st.local.slice();

    const box = document.createElement('div');
    box.className = 'places';
    box.innerHTML =
      '<div class="places-cols">' +
      '<div class="place" data-p="working"><div class="where">your laptop</div><h3>Working directory</h3><div class="sub">the files you edit</div><div class="place-body"></div></div>' +
      '<div class="place" data-p="staged"><div class="where">your laptop</div><h3>Staging area</h3><div class="sub">git add → "put in the box"</div><div class="place-body"></div></div>' +
      '<div class="place" data-p="local"><div class="where">your laptop</div><h3>Local repo</h3><div class="sub">git commit → "seal the box"</div><div class="place-body dots"></div></div>' +
      '<div class="place remote" data-p="remote"><div class="where">the internet</div><h3>GitHub (origin)</h3><div class="sub">git push → "ship the boxes"</div><div class="place-body dots"></div></div>' +
      '</div>' +
      '<div class="btn-row">' +
      '<button class="cmd-btn plain" data-a="edit">✎ Edit a file</button>' +
      '<button class="cmd-btn" data-a="add">git add .</button>' +
      '<button class="cmd-btn" data-a="commit">git commit -m "…"</button>' +
      '<button class="cmd-btn" data-a="push">git push</button>' +
      '<button class="cmd-btn" data-a="status">git status</button>' +
      '<button class="cmd-btn them plain" data-a="teammate">👤 A teammate pushes</button>' +
      '<button class="cmd-btn" data-a="pull">git pull</button>' +
      '<button class="cmd-btn plain" data-a="reset" title="Start over">↺</button>' +
      '</div>' +
      '<div class="term-line"><span class="i">Click the buttons left to right. Watch where your change goes.</span></div>';

    const col = p => box.querySelector('[data-p="' + p + '"]');
    const term = box.querySelector('.term-line');
    const say = (cmd, text, cls = '') => {
      term.innerHTML = (cmd ? '<span class="p">$ ' + esc(cmd) + '</span>\n' : '') + '<span class="' + cls + '">' + esc(text) + '</span>';
    };

    function draw() {
      const files = (list, cls) => list.length ? list.map(f => '<span class="chip ' + cls + '">' + esc(f) + '</span>').join('') : '<span class="empty">empty</span>';
      const dots = list => list.length ? list.map(c => '<span class="dot' + (c.w === 'them' ? ' them' : c.w === 'merge' ? ' merge' : '') + '" title="commit ' + c.l + '">' + c.l + '</span>').join('') : '<span class="empty">no commits</span>';
      col('working').querySelector('.place-body').innerHTML = files(st.working, 'mod');
      col('staged').querySelector('.place-body').innerHTML = files(st.staged, 'stg');
      col('local').querySelector('.place-body').innerHTML = dots(st.local);
      col('remote').querySelector('.place-body').innerHTML = dots(st.remote);
    }
    const has = (list, c) => list.some(x => x.l === c.l);

    const actions = {
      edit() {
        const free = FILES.filter(f => !st.working.includes(f));
        const f = free[Math.floor(Math.random() * free.length)] || FILES[0];
        if (!st.working.includes(f)) st.working.push(f);
        say('', 'You changed ' + f + '. Git notices, but has NOT saved anything yet.', 'i');
        flash(col('working'));
      },
      add() {
        if (!st.working.length) return say('git add .', 'Nothing to add: no changed files. Edit a file first.', 'i');
        st.working.forEach(f => { if (!st.staged.includes(f)) st.staged.push(f); });
        say('git add .', 'Staged: ' + st.working.join(', ') + '. These go into the NEXT commit.');
        st.working = [];
        flash(col('staged'));
      },
      commit() {
        if (!st.staged.length) {
          flash(col('staged'), 'bad');
          return say('git commit -m "update"', 'nothing added to commit' + (st.working.length ? ' but untracked/modified files present (use "git add")' : ', working tree clean'), 'e');
        }
        const c = { l: id(), w: 'me' };
        st.local.push(c);
        say('git commit -m "update ' + st.staged[0] + '"', '[main ' + c.l + '] saved ' + st.staged.length + ' file(s). Only on YOUR laptop so far.');
        st.staged = [];
        flash(col('local'));
      },
      push() {
        const missing = st.remote.filter(c => !has(st.local, c));
        if (missing.length) {
          flash(col('remote'), 'bad');
          return say('git push', ' ! [rejected]  main -> main (fetch first)\nGitHub has commit ' + missing.map(c => c.l).join(', ') + ' that you don\'t. Pull first.', 'e');
        }
        if (st.local.length === st.remote.length) return say('git push', 'Everything up-to-date', 'i');
        const sent = st.local.length - st.remote.length;
        st.remote = st.local.slice();
        say('git push', 'Sent ' + sent + ' commit(s) to GitHub. Now your teammates can pull them.');
        flash(col('remote'));
      },
      status() {
        const ahead = st.local.filter(c => !has(st.remote, c)).length;
        const lines = ['On branch main'];
        lines.push(ahead ? 'Your branch is ahead of \'origin/main\' by ' + ahead + ' commit(s).  (use "git push")' : 'Your branch is up to date with \'origin/main\' (as far as you know).');
        if (st.staged.length) lines.push('Changes to be committed:   ' + st.staged.join(', '));
        if (st.working.length) lines.push('Changes not staged:        ' + st.working.join(', '));
        if (!st.staged.length && !st.working.length) lines.push('nothing to commit, working tree clean');
        say('git status', lines.join('\n'), 'i');
      },
      teammate() {
        const c = { l: id(), w: 'them' };
        st.remote.push(c);
        say('', 'Your teammate pushed commit ' + c.l + ' to GitHub. Your laptop has no idea yet.', 'i');
        flash(col('remote'));
      },
      pull() {
        const missing = st.remote.filter(c => !has(st.local, c));
        if (!missing.length) return say('git pull', 'Already up to date.', 'i');
        const ahead = st.local.filter(c => !has(st.remote, c));
        if (ahead.length) {
          st.local = st.remote.concat(ahead, [{ l: id(), w: 'merge' }]);
          say('git pull', 'Downloaded ' + missing.map(c => c.l).join(', ') + ' and made a merge commit (gold) that combines their work with yours.\nNow git push will work.');
        } else {
          st.local = st.remote.slice();
          say('git pull', 'Fast-forward: downloaded ' + missing.map(c => c.l).join(', ') + '. You now have your teammate\'s work.');
        }
        flash(col('local'));
      },
      reset() {
        n = 0;
        st.working = []; st.staged = []; st.local = [{ l: id(), w: 'me' }]; st.remote = st.local.slice();
        say('', 'Start over: one commit, everything in sync.', 'i');
      }
    };
    box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { actions[b.dataset.a](); draw(); }));
    draw();
    return box;
  }

  /* =========================================================
     Widget 2 · Two people, one repo (step through)
     ========================================================= */
  function teamDemo() {
    const COLORS = { base: '#8e958c', alice: '#52775f', bob: '#42647c', merge: '#8a6d1f' };
    const k = (l, w, row = 0, p) => ({ l, w, row, p });
    const A = k('A', 'base'), B = k('B', 'base'), C = k('C', 'alice'), D = k('D', 'bob');
    const merged = [A, B, C, k('D', 'bob', 1, ['B']), k('M', 'merge', 0, ['C', 'D'])];
    const steps = [
      { alice: [A, B], gh: [A, B], bob: [A, B], who: ['alice', 'bob'], cmd: 'git clone github.com/cssg/site', out: 'Cloning into \'site\'... done.',
        note: 'Alice and Bob both <b>clone</b> the repo. There are now <b>three full copies</b> of the history: two laptops and GitHub.' },
      { alice: [A, B, C], who: ['alice'], cmd: 'git commit -m "add navbar"', out: '[main C] add navbar',
        note: 'Alice commits <b>C</b>. It only exists on her laptop. A commit is private until you <b>push</b>.' },
      { bob: [A, B, D], who: ['bob'], cmd: 'git commit -m "add footer"', out: '[main D] add footer',
        note: 'At the same time, Bob commits <b>D</b>. Now the three copies disagree. That is normal on a team.' },
      { gh: [A, B, C], who: ['alice'], cmd: 'git push', out: 'B..C  main -> main', ok: 'gh',
        note: 'Alice pushes first. GitHub had A B; Alice has A B C, which just adds on top. Accepted.' },
      { who: ['bob'], cmd: 'git push', out: ' ! [rejected] main -> main (fetch first)\nhint: the remote contains work that\nyou do not have locally.', bad: ['bob', 'gh'],
        note: 'Bob pushes and GitHub <b>refuses</b>. Taking Bob\'s A B D would erase Alice\'s C. <b>Git never silently throws away someone\'s work.</b>' },
      { bob: merged, who: ['bob'], cmd: 'git pull', out: 'Merge made by the \'ort\' strategy.',
        note: 'Bob <b>pulls</b>: Git downloads C and makes a <b>merge commit M</b> with two parents, C and D. They edited different files, so Git does it automatically.' },
      { gh: merged, who: ['bob'], cmd: 'git push', out: 'C..M  main -> main', ok: 'gh',
        note: 'Now Bob has everything GitHub has, plus more. The push goes through.' },
      { alice: merged, who: ['alice'], cmd: 'git pull', out: 'Fast-forward', ok: 'alice',
        note: 'Alice pulls to get Bob\'s footer. All three copies match again. <b>Pull before you start, push when you\'re done.</b>' }
    ];
    // Fill in each step from the previous one
    const states = [];
    steps.forEach((s, i) => {
      const prev = states[i - 1] || {};
      states.push(Object.assign({}, prev, { bad: null, ok: null }, s));
    });

    function svg(list) {
      const COL = 46, PX = 22, Y0 = 26, ROW = 34;
      const rows = Math.max(...list.map(c => c.row)) + 1;
      const w = Math.max(PX * 2 + (5 - 1) * COL, PX * 2 + (list.length - 1) * COL);
      const h = Y0 + (rows - 1) * ROW + 24;
      const pos = {};
      list.forEach((c, i) => (pos[c.l] = { x: PX + i * COL, y: Y0 + c.row * ROW }));
      let s = '<svg viewBox="0 0 ' + w + ' ' + Math.max(h, 50 + ROW) + '">';
      list.forEach((c, i) => {
        const parents = c.p || (i ? [list[i - 1].l] : []);
        parents.forEach(pl => {
          const a = pos[pl], b = pos[c.l];
          s += a.y === b.y ? '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#b9bdb4" stroke-width="3"/>'
            : '<path d="M' + a.x + ' ' + a.y + ' C' + (a.x + 26) + ' ' + a.y + ',' + (b.x - 26) + ' ' + b.y + ',' + b.x + ' ' + b.y + '" stroke="#b9bdb4" stroke-width="3" fill="none"/>';
        });
      });
      list.forEach(c => {
        const { x, y } = pos[c.l];
        s += '<circle cx="' + x + '" cy="' + y + '" r="14" fill="' + COLORS[c.w] + '"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="ui-monospace,monospace">' + c.l + '</text>';
      });
      return s + '</svg>';
    }

    const box = document.createElement('div');
    box.className = 'team';
    const repo = (key, name, sub, av) =>
      '<div class="repo' + (key === 'gh' ? ' gh' : '') + '" data-r="' + key + '"><h3>' + av + name + '</h3><div class="sub">' + sub + '</div><div class="pic"></div><div class="rterm"></div></div>';
    box.innerHTML =
      '<div class="team-cols">' +
      repo('alice', 'Alice\'s laptop', 'local repo', '<span class="avatar" style="background:' + COLORS.alice + '">A</span>') +
      repo('gh', 'GitHub', 'origin · the shared copy', '<span class="avatar" style="background:#1e2723">⌂</span>') +
      repo('bob', 'Bob\'s laptop', 'local repo', '<span class="avatar" style="background:' + COLORS.bob + '">B</span>') +
      '</div>' +
      '<div class="legend"><span><i style="background:' + COLORS.base + '"></i>already there</span><span><i style="background:' + COLORS.alice + '"></i>Alice\'s commit</span><span><i style="background:' + COLORS.bob + '"></i>Bob\'s commit</span><span><i style="background:' + COLORS.merge + '"></i>merge commit</span></div>' +
      '<p class="team-note"></p>' +
      '<div class="team-ctrl"><button class="arrow-button" data-a="back">◀</button><span class="count"></span><button class="next-button" data-a="next">Step ▶</button><button class="arrow-button" data-a="reset" title="Back to the start">⏮</button></div>';

    let at = 0;
    function draw(animate) {
      const s = states[at], prev = states[at - 1];
      ['alice', 'gh', 'bob'].forEach(r => {
        const el = box.querySelector('[data-r="' + r + '"]');
        el.querySelector('.pic').innerHTML = svg(s[r]);
        const t = el.querySelector('.rterm');
        const actor = r !== 'gh' && s.who.includes(r);
        t.classList.toggle('on', actor);
        t.innerHTML = actor ? '<span class="p">$ ' + esc(s.cmd) + '</span>\n<span class="' + (s.bad ? 'e' : '') + '">' + esc(s.out) + '</span>' : (r === 'gh' ? '<span>waiting for pushes</span>' : '');
        if (!animate) return;
        if (s.bad && s.bad.includes(r)) flash(el, 'bad');
        else if (prev && prev[r] !== s[r]) flash(el);
      });
      box.querySelector('.team-note').innerHTML = s.note;
      box.querySelector('.count').textContent = (at + 1) + ' / ' + states.length;
      box.querySelector('[data-a="back"]').disabled = at === 0;
      box.querySelector('[data-a="next"]').disabled = at === states.length - 1;
    }
    box.querySelector('[data-a="next"]').addEventListener('click', () => { if (at < states.length - 1) { at++; draw(true); } });
    box.querySelector('[data-a="back"]').addEventListener('click', () => { if (at > 0) { at--; draw(false); } });
    box.querySelector('[data-a="reset"]').addEventListener('click', () => { at = 0; draw(false); });
    box.step = dir => {
      const b = box.querySelector('[data-a="' + (dir > 0 ? 'next' : 'back') + '"]');
      if (b.disabled) return false;
      b.click();
      return true;
    };
    draw(false);
    return box;
  }

  /* =========================================================
     Widget 3 · Fix the merge conflict
     ========================================================= */
  function resolveDemo() {
    const before = ['<header>', '<<<<<<< HEAD', '  <h1>Welcome to CSSG</h1>', '=======', '  <h1>Hello, CSSG!</h1>', '>>>>>>> origin/main', '  <nav>…</nav>', '</header>'];
    const kinds = ['', 'mk', 'mine', 'mk', 'theirs', 'mk', '', ''];
    const OPTIONS = {
      mine: { label: 'Keep mine', sub: 'the HEAD side: what you wrote', lines: ['<header>', '  <h1>Welcome to CSSG</h1>', '  <nav>…</nav>', '</header>'], hl: 1,
        verdict: ['good', 'Fine, if your teammate agrees. You just threw away their wording, so tell them.'] },
      theirs: { label: 'Keep theirs', sub: 'the incoming side from GitHub', lines: ['<header>', '  <h1>Hello, CSSG!</h1>', '  <nav>…</nav>', '</header>'], hl: 1,
        verdict: ['good', 'Fine. Your version is gone; theirs wins.'] },
      both: { label: 'Combine them by hand', sub: 'usually the best answer', lines: ['<header>', '  <h1>Hello, welcome to CSSG!</h1>', '  <nav>…</nav>', '</header>'], hl: 1,
        verdict: ['good', 'Best of both. Resolving a conflict just means: make the file look how it SHOULD look, then delete the markers.'] },
      oops: { label: 'Commit it with the markers still in', sub: 'what could go wrong?', lines: before, hl: -1,
        verdict: ['bad', 'Your live website now literally shows "<<<<<<< HEAD" and "=======". Git does not check. Always search for <<<<<<< before you commit.'] }
    };
    const box = document.createElement('div');
    box.className = 'resolve';
    box.innerHTML =
      '<div><div class="window-label"><span>index.html · CONFLICT</span><span class="lbl">both modified</span></div><pre class="code"></pre></div>' +
      '<div><div class="choices"></div><div class="verdict" hidden></div><ol class="steps" hidden></ol></div>';
    const code = box.querySelector('.code');
    const showCode = (lines, cls) => { code.innerHTML = lines.map((l, i) => '<span class="ln ' + cls(i) + '">' + esc(l) + '</span>').join(''); };
    showCode(before, i => kinds[i]);

    const choices = box.querySelector('.choices');
    const verdict = box.querySelector('.verdict');
    const steps = box.querySelector('.steps');
    Object.keys(OPTIONS).forEach(key => {
      const o = OPTIONS[key];
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = '<b>' + esc(o.label) + '</b><small>' + esc(o.sub) + '</small>';
      b.addEventListener('click', () => {
        choices.querySelectorAll('.choice').forEach(c => c.classList.toggle('picked', c === b));
        if (key === 'oops') showCode(o.lines, i => kinds[i] === 'mk' ? 'bad' : kinds[i]);
        else showCode(o.lines, i => i === o.hl ? 'new' : '');
        box.querySelector('.lbl').textContent = key === 'oops' ? 'still broken' : 'edited ✓';
        verdict.hidden = false;
        verdict.className = 'verdict ' + o.verdict[0];
        verdict.textContent = o.verdict[1];
        steps.hidden = false;
        const list = key === 'oops' ? [] : ['Edit the file, delete all three marker lines', 'git add index.html', 'git commit', 'git push'];
        steps.innerHTML = list.map((s, i) => '<li class="' + (i === 0 ? 'done' : '') + '"><span class="box">✓</span>' + (i === 0 ? '<span>' + esc(s) + '</span>' : '<button class="cmd-btn"' + (i > 1 ? ' disabled' : '') + '>' + esc(s) + '</button>') + '</li>').join('');
        steps.querySelectorAll('button').forEach((btn, i) => btn.addEventListener('click', () => {
          btn.closest('li').classList.add('done');
          btn.disabled = true;
          const next = steps.querySelectorAll('button')[i + 1];
          if (next) next.disabled = false;
          else { verdict.className = 'verdict good'; verdict.textContent = 'Conflict resolved and shared. The merge commit records both histories.'; }
        }));
      });
      choices.append(b);
    });
    return box;
  }

  /* =========================================================
     Small interactions: flip cards, reveal cards, pipeline
     ========================================================= */
  function hydrate(root) {
    root.querySelectorAll('[data-widget]').forEach(el => {
      const w = el.dataset.widget;
      let node = null;
      if (w === 'places') node = placesDemo();
      if (w === 'team') node = teamDemo();
      if (w === 'resolve') node = resolveDemo();
      if (w === 'sim') node = window.GitSim({ chips: (el.dataset.chips || '').split('|').filter(Boolean) }).el;
      if (node) el.replaceWith(node);
    });
    root.querySelectorAll('.cmd-card,.qcard').forEach(c => c.addEventListener('click', () => c.classList.toggle('open')));
    root.querySelectorAll('.pipeline').forEach(p => {
      const detail = p.nextElementSibling;
      p.querySelectorAll('.pipe').forEach(step => step.addEventListener('click', () => {
        p.querySelectorAll('.pipe').forEach(s => s.classList.toggle('on', s === step));
        detail.innerHTML = step.querySelector('template').innerHTML;
      }));
    });
    root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); setMode(b.dataset.open); }));
  }

  /* =========================================================
     Deck
     ========================================================= */
  const templates = [...document.querySelectorAll('#slideTemplates template')];
  const slide = document.getElementById('slide');
  const nav = document.getElementById('sectionNav');
  const minutes = t => parseInt(t.dataset.time, 10) || 0;
  document.getElementById('totalTime').textContent = templates.reduce((a, t) => a + minutes(t), 0) + ' MIN';
  document.getElementById('routeCount').textContent = templates.length + ' SLIDES';

  let lastPart = null;
  templates.forEach((t, i) => {
    if (t.dataset.part !== lastPart) {
      lastPart = t.dataset.part;
      const h = document.createElement('div');
      h.className = 'nav-part';
      h.textContent = lastPart;
      nav.append(h);
    }
    const b = document.createElement('button');
    b.className = 'nav-item' + ('game' in t.dataset ? ' is-game' : '');
    b.innerHTML = '<span class="nav-number">' + pad(i + 1) + '</span><span>' + esc(t.dataset.title) + '</span><span class="nav-duration">' + minutes(t) + 'm</span>';
    b.addEventListener('click', () => go(i));
    nav.append(b);
  });

  let current = 0;
  function go(i) {
    current = Math.max(0, Math.min(templates.length - 1, i));
    const t = templates[current];
    slide.innerHTML = '';
    slide.append(t.content.cloneNode(true));
    slide.style.animation = 'none'; void slide.offsetWidth; slide.style.animation = '';
    hydrate(slide);
    document.getElementById('sectionLabel').textContent = t.dataset.label || t.dataset.part;
    document.getElementById('sectionTime').textContent = t.dataset.time;
    document.getElementById('slideIndex').textContent = 'SLIDE ' + pad(current + 1) + ' / ' + pad(templates.length);
    const elapsed = templates.slice(0, current + 1).reduce((a, x) => a + minutes(x), 0);
    document.getElementById('progress').style.width = (elapsed / templates.reduce((a, x) => a + minutes(x), 0) * 100) + '%';
    nav.querySelectorAll('.nav-item').forEach((b, k) => b.classList.toggle('active', k === current));
    document.getElementById('prev').disabled = current === 0;
    document.getElementById('next').disabled = current === templates.length - 1;
    store.set('slide', current);
    history.replaceState(null, '', '#' + (current + 1));
  }
  // → first steps the Alice & Bob demo, then moves on
  function next() {
    const team = slide.querySelector('.team');
    if (team && team.step(1)) return;
    go(current + 1);
  }
  document.getElementById('prev').addEventListener('click', () => go(current - 1));
  document.getElementById('next').addEventListener('click', () => go(current + 1));
  document.getElementById('present').addEventListener('click', togglePresent);

  function togglePresent() {
    const on = !document.body.classList.contains('presenting');
    document.body.classList.toggle('presenting', on);
    try {
      if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) document.exitFullscreen();
    } catch (e) { /* fullscreen not allowed */ }
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('presenting'); });

  /* ---------- Modes: slides / sandbox / game ---------- */
  const modes = { slides: 'slidesMode', sandbox: 'sandboxMode', game: 'gameMode' };
  let mode = 'slides';
  function setMode(m) {
    mode = m;
    Object.keys(modes).forEach(k => (document.getElementById(modes[k]).hidden = k !== m));
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
    document.body.classList.remove('presenting');
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.mode-tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

  document.addEventListener('keydown', e => {
    if (mode !== 'slides' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
    else if (e.key === 'f' || e.key === 'F') togglePresent();
    else if (e.key === 'Escape' && document.body.classList.contains('presenting')) togglePresent();
  });

  /* ---------- Sandbox page with self-checking challenges ---------- */
  const CHALLENGES = [
    ['Make one commit on <code>main</code>', r => r.commits.some(c => c.lane === 0 && c.i > 0)],
    ['Create a branch called <code>feature</code> and switch to it', r => 'feature' in r.lanes && (r.head === 'feature' || r.commits.some(c => c.lane === r.lanes.feature))],
    ['Make two commits on <code>feature</code>', r => 'feature' in r.lanes && r.commits.filter(c => c.lane === r.lanes.feature).length >= 2],
    ['Switch back to <code>main</code> and commit once more (now they\'ve diverged)', r => {
      if (!('feature' in r.lanes)) return false;
      const firstF = r.commits.find(c => c.lane === r.lanes.feature);
      return !!firstF && r.commits.some(c => c.lane === 0 && c.i > firstF.i && c.parents.length === 1);
    }],
    ['Merge <code>feature</code> into <code>main</code> (look for the ringed merge commit)', r => r.commits.some(c => c.parents.length === 2 && c.lane === 0)],
    ['Bonus: delete the <code>feature</code> label. Where did its commits go?', r => !('feature' in r.branches) && r.commits.some(c => c.parents.length === 2)]
  ];
  const list = document.getElementById('challengeList');
  list.innerHTML = CHALLENGES.map(c => '<li><span class="box">✓</span><span>' + c[0] + '</span></li>').join('');
  const big = window.GitSim({
    tall: true,
    intro: 'Your own repo. Type "help" for commands, ↑ for history, "reset" to start over.',
    chips: ['git status', 'git commit -m "add page"', 'git switch -c feature', 'git switch main', 'git merge feature', 'git log --oneline', 'git branch'],
    onChange(r) { list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('done', !!CHALLENGES[i][1](r))); }
  });
  document.getElementById('sandboxHolder').append(big.el);

  /* ---------- Start ---------- */
  const fromHash = parseInt(location.hash.slice(1), 10);
  const saved = parseInt(store.get('slide'), 10);
  go(fromHash ? fromHash - 1 : (saved || 0));
  window.Deck = { setMode };
})();
