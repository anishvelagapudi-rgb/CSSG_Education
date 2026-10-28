(() => {
  const templates = [...document.querySelectorAll('#slideTemplates template')];
  const { esc, highlight } = window.Lab;
  const pad = n => String(n).padStart(2, '0');
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('cssg-lesson4-deck') : null;

  /* ---------- Small helpers ---------- */
  function dedent(text) {
    const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
    const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length);
    const cut = indents.length ? Math.min(...indents) : 0;
    return lines.map(l => l.slice(cut)).join('\n').replace(/<\\\/script>/g, '</script>') + '\n';
  }

  function parseMarks(spec) {
    const marks = new Set();
    (spec || '').split(',').filter(Boolean).forEach(part => {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= (b || a); i++) marks.add(i);
    });
    return marks;
  }

  function codeWindow(code, { label = '', marks = null, big = false } = {}) {
    const box = document.createElement('div');
    box.className = 'code-window' + (big ? ' big' : '');
    box.innerHTML = '<div class="window-label"><span>' + esc(label) + '</span><span></span></div>' +
      '<pre>' + highlight(code.replace(/\n$/, ''), marks) + '</pre>';
    return box;
  }

  /* ---------- Speaker view: a second window with the notes, a clock, and a remote ---------- */
  if (new URLSearchParams(location.search).has('speaker')) {
    speakerView();
    return;
  }

  /* ---------- Event loop / memory visualizer ---------- */
  const PANELS = {
    stack: ['Call stack', 'top one runs'],
    heap: ['Heap', 'objects live here'],
    apis: ['Web APIs', 'the browser, not JS'],
    micro: ['Microtask queue', 'promises · go first'],
    tasks: ['Task queue', 'timers · clicks · network'],
    console: ['Console', '']
  };
  const PHASES = { idle: 'WAITING', sync: 'RUNNING SCRIPT', micro: 'MICROTASKS', task: 'NEXT TASK', done: 'FINISHED' };

  // Fill in every step: each one only lists what changed.
  function expand(trace) {
    let state = { stack: [], heap: [], apis: [], micro: [], tasks: [], out: [], phase: 'idle' };
    return trace.steps.map(step => {
      state = Object.assign({}, state, step, { line: step.line || null, note: step.note || '' });
      if (step.log !== undefined) state.out = state.out.concat(String(step.log));
      delete state.log;
      return state;
    });
  }

  const frameKey = f => typeof f === 'string' ? f : f.fn + JSON.stringify(f.vars || {});

  function traceView(name) {
    const trace = window.TRACES[name];
    const states = expand(trace);
    const totalOut = states[states.length - 1].out.length;
    let at = 0;

    const box = document.createElement('div');
    box.className = 'trace';
    const code = codeWindow(trace.code, { label: 'step through it · → or ▶' });
    box.append(code);
    const lines = code.querySelectorAll('.ln');

    const panels = document.createElement('div');
    panels.className = 'trace-panels';
    const bodies = {};
    const inner = trace.panels.filter(p => p !== 'console');
    trace.panels.forEach(p => {
      const el = document.createElement('div');
      const wide = p === 'console' || (inner.length % 2 === 1 && p === inner[inner.length - 1]);
      el.className = 'tp ' + p + (wide ? ' wide' : '');
      el.innerHTML = '<div class="tp-head"><span>' + PANELS[p][0] + '</span><i>' + PANELS[p][1] + '</i></div><div class="tp-body"></div>';
      bodies[p] = el.querySelector('.tp-body');
      panels.append(el);
    });
    box.append(panels);

    const foot = document.createElement('div');
    foot.className = 'trace-foot';
    foot.innerHTML = '<span class="trace-phase"></span><div class="trace-note"></div>' +
      '<div class="trace-ctrl"><button type="button" data-a="reset" title="Back to the start">⏮</button>' +
      '<button type="button" data-a="back" title="Step back">◀</button><span class="count"></span>' +
      '<button type="button" class="primary" data-a="next">Step ▶</button>' +
      '<button type="button" data-a="end" title="Jump to the answer">answer</button></div>';
    box.append(foot);

    function chips(list, prevList, cls = 'chip') {
      const before = new Set((prevList || []).map(frameKey));
      return list.map(item => {
        const el = document.createElement('div');
        el.className = cls + (before.has(frameKey(item)) ? '' : ' fresh');
        if (typeof item === 'string') el.textContent = item;
        else {
          el.textContent = item.fn;
          const vars = document.createElement('div');
          vars.className = 'vars';
          Object.entries(item.vars || {}).forEach(([k, v]) => {
            const a = document.createElement('span'); a.textContent = k;
            const b = document.createElement('span'); b.textContent = v;
            if (String(v).startsWith('→')) b.className = 'ref';
            vars.append(a, b);
          });
          if (vars.children.length) el.append(vars);
        }
        return el;
      });
    }

    function heapObjs(list, prevList) {
      const before = new Map((prevList || []).map(o => [o.id, JSON.stringify(o)]));
      return list.map(obj => {
        const el = document.createElement('div');
        el.className = 'heap-obj' + (!before.has(obj.id) ? ' fresh' : before.get(obj.id) !== JSON.stringify(obj) && !obj.gc ? ' changed' : '') + (obj.gc ? ' gc' : '');
        el.innerHTML = '<div class="h"><b></b><span></span></div><div class="r"></div>';
        el.querySelector('b').textContent = obj.id;
        el.querySelector('.h span').textContent = obj.kind + (obj.gc ? ' · garbage' : '');
        const rows = el.querySelector('.r');
        (obj.rows || []).forEach(([k, v]) => {
          const a = document.createElement('span'); a.textContent = k;
          const b = document.createElement('span'); b.textContent = v;
          if (String(v).startsWith('→')) b.className = 'ref';
          rows.append(a, b);
        });
        return el;
      });
    }

    function empty(text) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = text;
      return e;
    }

    function draw() {
      const s = states[at];
      const prev = at > 0 ? states[at - 1] : null;
      lines.forEach((ln, i) => ln.classList.toggle('now', s.line === i + 1));
      if (s.line && lines[s.line - 1]) lines[s.line - 1].scrollIntoView({ block: 'nearest' });
      ['stack', 'apis', 'micro', 'tasks'].forEach(p => {
        if (!bodies[p]) return;
        const list = s[p] || [];
        bodies[p].replaceChildren(...(list.length ? chips(list, prev && prev[p]) : [empty('empty')]));
      });
      if (bodies.heap) bodies.heap.replaceChildren(...(s.heap.length ? heapObjs(s.heap, prev && prev.heap) : [empty('nothing yet')]));
      if (bodies.console) {
        const rows = [];
        for (let i = 0; i < totalOut; i++) {
          const r = document.createElement('div');
          if (i < s.out.length) {
            r.className = 'out' + (!prev || i >= prev.out.length ? ' fresh' : '');
            r.textContent = s.out[i];
          } else { r.className = 'out slot'; r.textContent = '?'; }
          rows.push(r);
        }
        bodies.console.replaceChildren(...rows);
      }
      const phase = foot.querySelector('.trace-phase');
      phase.className = 'trace-phase ' + s.phase;
      phase.textContent = PHASES[s.phase] || s.phase;
      foot.querySelector('.trace-note').innerHTML = s.note;
      foot.querySelector('.count').textContent = at + ' / ' + (states.length - 1);
      foot.querySelector('[data-a="back"]').disabled = at === 0;
      foot.querySelector('[data-a="reset"]').disabled = at === 0;
      foot.querySelector('[data-a="next"]').disabled = at === states.length - 1;
      foot.querySelector('[data-a="end"]').disabled = at === states.length - 1;
      syncNextLabel();
    }

    function step(dir) {
      const to = at + dir;
      if (to < 0 || to >= states.length) return false;
      at = to; draw();
      return true;
    }
    foot.addEventListener('click', e => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a;
      if (a === 'next') step(1);
      else if (a === 'back') step(-1);
      else if (a === 'reset') { at = 0; draw(); }
      else if (a === 'end') { at = states.length - 1; draw(); }
    });
    box.step = step;
    box.atEnd = () => at === states.length - 1;
    box.atStart = () => at === 0;
    setTimeout(draw, 0);
    return box;
  }

  /* ---------- “Freeze the page” demo ---------- */
  function freezeDemo() {
    const box = document.createElement('div');
    box.className = 'freeze';
    box.innerHTML =
      '<div class="freeze-stage"><div class="freeze-track"><div class="freeze-ball"></div></div>' +
      '<div class="freeze-clock">0.0 s</div>' +
      '<input placeholder="Type here while it runs…">' +
      '<button type="button" class="arrow-button" data-click>Clicked 0 times</button>' +
      '<div class="freeze-status">Moved by JavaScript, 60 times a second.</div></div>' +
      '<div class="freeze-buttons">' +
      '<button type="button" class="bad" data-block><b>while (…) { } for 3 s</b>Do the waiting <i>on the main thread</i>: a loop that checks the clock until 3 s pass.</button>' +
      '<button type="button" class="good" data-wait><b>setTimeout(…, 3000)</b>Ask the browser to call us back in 3 s. The main thread is free meanwhile.</button>' +
      '<button type="button" class="good" data-await><b>await wait(3000)</b>Same as setTimeout, written with a promise. (Section 02.)</button></div>';
    const ball = box.querySelector('.freeze-ball');
    const clock = box.querySelector('.freeze-clock');
    const status = box.querySelector('.freeze-status');
    const t0 = performance.now();
    let clicks = 0;
    (function frame(now) {
      if (!box.isConnected && box.dataset.mounted) return; // slide changed: stop animating
      if (box.isConnected) box.dataset.mounted = '1';
      const track = box.querySelector('.freeze-track').clientWidth - 24;
      const p = ((now - t0) / 1600) % 2;
      ball.style.transform = 'translateX(' + (p < 1 ? p : 2 - p) * track + 'px)';
      clock.textContent = ((now - t0) / 1000).toFixed(1) + ' s';
      requestAnimationFrame(frame);
    })(t0);
    box.querySelector('[data-click]').addEventListener('click', e => { e.currentTarget.textContent = 'Clicked ' + (++clicks) + ' times'; });
    box.querySelector('[data-block]').addEventListener('click', () => {
      status.textContent = 'Blocking… (you won\'t see this update until it\'s over)';
      setTimeout(() => {
        const start = performance.now();
        while (performance.now() - start < 3000) { /* busy: nothing else can run */ }
        status.textContent = 'Frozen for 3 s. Clicks and typing waited in the queue, then all ran at once.';
      }, 30);
    });
    box.querySelector('[data-wait]').addEventListener('click', () => {
      status.textContent = 'Waiting 3 s with setTimeout… the ball keeps moving.';
      setTimeout(() => { status.textContent = 'Done! The browser called us back.'; }, 3000);
    });
    box.querySelector('[data-await]').addEventListener('click', async () => {
      status.textContent = 'await wait(3000)… still smooth.';
      await new Promise(r => setTimeout(r, 3000));
      status.textContent = 'Done! The rest of the async function ran after the await.';
    });
    return box;
  }

  /* ---------- Pokédex demo: loading / error / success, and a race condition ---------- */
  function pokeDemo() {
    const box = document.createElement('div');
    box.className = 'poke';
    box.innerHTML =
      '<div><div class="browser-frame"><div class="browser-bar"><i></i><i></i><i></i><span>pokedex.local</span><span class="state-tag">idle</span></div>' +
      '<div class="poke-app"><form><input value="pikachu" aria-label="Pokémon name" autocomplete="off"><button>Search</button></form>' +
      '<div class="poke-out"><span class="loading">Type a name and press Search.</span></div></div></div></div>' +
      '<div class="poke-ctrl">' +
      '<label><select data-net><option value="live">network: live</option><option value="mock">network: offline copy</option></select></label>' +
      '<label><input type="checkbox" data-slow> Slow network (+2 s)</label>' +
      '<label><input type="checkbox" data-down> Network is down</label>' +
      '<label><input type="checkbox" data-type> Search as you type, random delays</label>' +
      '<label><input type="checkbox" data-stale> Ignore out-of-date responses (the fix)</label>' +
      '<div class="poke-log" aria-live="polite"></div></div>';
    const out = box.querySelector('.poke-out');
    const tag = box.querySelector('.state-tag');
    const input = box.querySelector('input');
    const logBox = box.querySelector('.poke-log');
    const opt = name => box.querySelector('[data-' + name + ']').checked;
    let reqId = 0;

    function log(text, cls = '') {
      const d = document.createElement('div');
      d.className = cls; d.textContent = text;
      logBox.append(d); logBox.scrollTop = logBox.scrollHeight;
      return d;
    }
    function setState(state, html) {
      tag.className = 'state-tag ' + state; tag.textContent = state;
      out.innerHTML = html;
    }

    async function search(name) {
      name = name.trim().toLowerCase();
      if (!name) return;
      const id = ++reqId;
      const t0 = performance.now();
      const line = log('#' + id + ' GET /pokemon/' + name + ' …');
      setState('loading', '<span class="loading">Loading ' + esc(name) + '…</span>');
      const host = opt('down') ? 'https://pokeapi.invalid' : 'https://pokeapi.co';
      const extra = opt('slow') ? 2000 : opt('type') ? Math.random() * 2200 : 0;
      const stale = () => opt('stale') && id !== reqId;
      try {
        const res = await window.Lab.fetch(host + '/api/v2/pokemon/' + encodeURIComponent(name));
        await new Promise(r => setTimeout(r, extra));
        const ms = Math.round(performance.now() - t0);
        line.textContent = '#' + id + ' GET /pokemon/' + name + ' → ' + res.status + ' in ' + ms + ' ms';
        if (stale()) { line.className = 'stale'; line.textContent += ' (ignored: out of date)'; return; }
        if (!res.ok) throw new Error(res.status === 404 ? 'No Pokémon called “' + name + '” (404).' : 'Server said ' + res.status + '.');
        const data = await res.json();
        line.className = 'ok';
        setState('success', '<div><img alt="" src="' + esc(data.sprites.front_default || '') + '" onerror="this.remove()">' +
          '<div><b>#' + data.id + ' ' + esc(data.name) + '</b></div><small>' + data.types.map(t => esc(t.type.name)).join(' · ') +
          ' · ' + data.height * 10 + ' cm · ' + data.weight / 10 + ' kg</small></div>');
      } catch (err) {
        if (stale()) { line.className = 'stale'; return; }
        line.className = 'err';
        line.textContent = '#' + id + ' ' + name + ' ✗ ' + err.message;
        setState('error', '<div class="error">Something went wrong: ' + esc(err.message) + '<br><button type="button" class="arrow-button" style="margin-top:10px">Try again</button></div>');
        out.querySelector('button').addEventListener('click', () => search(name));
      }
    }

    box.querySelector('form').addEventListener('submit', e => { e.preventDefault(); search(input.value); });
    input.addEventListener('input', () => { if (opt('type')) search(input.value); });
    input.addEventListener('keydown', e => e.stopPropagation());
    const select = box.querySelector('[data-net]');
    select.value = window.Lab.net();
    select.addEventListener('change', () => window.Lab.setNet(select.value));
    return box;
  }

  /* ---------- Predict banner with a think timer ---------- */
  function predictBar(holder) {
    const secs = Number(holder.dataset.predict) || 60;
    const bar = document.createElement('div');
    bar.className = 'predict-bar';
    bar.innerHTML = '<span class="badge predict">PREDICT</span><b></b>' +
      '<span class="steps"><span>1 · THINK ALONE</span><span>2 · TELL A NEIGHBOR</span><span>3 · VOTE</span><span>4 · STEP THROUGH</span></span>' +
      '<button type="button" class="think-timer"></button>';
    bar.querySelector('b').innerHTML = holder.innerHTML || 'Pause. What prints?';
    const button = bar.querySelector('.think-timer');
    let timer = null, left = secs;
    const label = () => { button.textContent = timer ? '⏱ ' + Math.floor(left / 60) + ':' + pad(left % 60) : left === 0 ? '✓ time\'s up' : '⏱ ' + secs + 's to think'; };
    button.addEventListener('click', () => {
      if (timer || left === 0) { clearInterval(timer); timer = null; left = secs; button.className = 'think-timer'; label(); return; }
      button.className = 'think-timer running';
      timer = setInterval(() => {
        left--;
        if (left <= 0 || !button.isConnected) { clearInterval(timer); timer = null; left = 0; button.className = 'think-timer done'; }
        label();
      }, 1000);
      label();
    });
    label();
    return bar;
  }

  /* ---------- Turn slide markup into live pieces ---------- */
  function enhance(root) {
    root.querySelectorAll('[data-predict]').forEach(el => el.replaceWith(predictBar(el)));
    root.querySelectorAll('[data-trace]').forEach(el => el.replaceWith(traceView(el.dataset.trace)));
    root.querySelectorAll('[data-freeze]').forEach(el => el.replaceWith(freezeDemo()));
    root.querySelectorAll('[data-poke]').forEach(el => el.replaceWith(pokeDemo()));
    root.querySelectorAll('script[type="text/plain"]').forEach(block => {
      const code = dedent(block.textContent);
      const d = block.dataset;
      const node = 'run' in d
        ? window.Lab.runner(code, { marks: parseMarks(d.mark), file: d.file || 'script.js', net: 'net' in d, stack: 'stack' in d, big: 'big' in d })
        : codeWindow(code, { label: d.label || '', marks: parseMarks(d.mark), big: 'big' in d });
      if (d.style) node.style.cssText += d.style;
      block.replaceWith(node);
    });
    root.querySelectorAll('[data-reveal]').forEach(button => button.addEventListener('click', () => {
      button.nextElementSibling.classList.toggle('show');
    }));
    root.querySelectorAll('.latency td.human').forEach(td => td.addEventListener('click', () => td.classList.toggle('show')));
    root.querySelectorAll('.quiz').forEach(quiz => {
      const feedback = quiz.querySelector('.feedback');
      quiz.querySelectorAll('.options button').forEach(button => button.addEventListener('click', () => {
        quiz.querySelectorAll('.options button').forEach(b => b.classList.remove('right', 'wrong'));
        const ok = 'ok' in button.dataset;
        button.classList.add(ok ? 'right' : 'wrong');
        feedback.innerHTML = (ok ? '<b>Yes.</b> ' : '<b>Not quite.</b> ') + (button.dataset.why || '');
      }));
    });
    root.querySelectorAll('[data-open]').forEach(button =>
      button.addEventListener('click', () => setMode(button.dataset.open)));
  }

  /* ---------- Navigation ---------- */
  const nav = document.getElementById('sectionNav');
  const slide = document.getElementById('slide');
  let current = 0;
  let lastPart = '';
  templates.forEach((template, index) => {
    const d = template.dataset;
    if (d.part && d.part !== lastPart) {
      lastPart = d.part;
      const head = document.createElement('div');
      head.className = 'nav-part';
      head.textContent = lastPart;
      nav.append(head);
    }
    const button = document.createElement('button');
    button.className = 'nav-item' + ('optional' in d ? ' optional' : '') + (template.content.querySelector('[data-predict]') ? ' predict' : '');
    button.innerHTML = '<span class="nav-number">' + pad(index + 1) + '</span><span></span><span class="nav-duration">' + (d.time || '') + '</span>';
    button.children[1].textContent = d.title;
    button.addEventListener('click', () => go(index));
    nav.append(button);
  });
  const minutes = list => list.reduce((sum, t) => sum + (parseInt(t.dataset.time, 10) || 0), 0);
  const core = minutes(templates.filter(t => !('optional' in t.dataset)));
  document.getElementById('totalTime').textContent = 'CORE ≈ ' + core + ' MIN · +' + (minutes(templates) - core) + ' OPTIONAL';

  const trace = () => slide.querySelector('.trace');

  function syncNextLabel() {
    const t = trace();
    const next = document.getElementById('next');
    if (t && !t.atEnd()) next.innerHTML = 'Step <span>▶</span>';
    else next.innerHTML = current === templates.length - 1 ? 'Assignment <span>→</span>' : 'Next <span>→</span>';
  }

  // → steps through a trace on the slide before moving on, like a clicker should.
  function forward() {
    const t = trace();
    if (t && t.step(1)) return;
    if (current < templates.length - 1) go(current + 1);
    else setMode('assignment');
  }
  function backward() {
    const t = trace();
    if (t && t.step(-1)) return;
    go(current - 1);
  }

  function go(index) {
    current = Math.max(0, Math.min(templates.length - 1, index));
    render();
  }

  function render() {
    const template = templates[current];
    document.getElementById('sectionLabel').textContent = template.dataset.label || '';
    document.getElementById('sectionTime').textContent = template.dataset.time || '';
    document.getElementById('slideIndex').textContent = 'SLIDE ' + pad(current + 1) + ' / ' + templates.length;
    document.getElementById('routeCount').textContent = pad(current + 1) + ' / ' + templates.length;
    document.getElementById('progress').style.width = ((current + 1) / templates.length * 100) + '%';
    slide.replaceChildren(template.content.cloneNode(true));
    enhance(slide);
    slide.classList.remove('fade-in');
    void slide.offsetWidth;
    slide.classList.add('fade-in');
    document.querySelectorAll('.nav-item').forEach((button, index) => {
      button.classList.toggle('active', index === current);
      if (index === current) { button.setAttribute('aria-current', 'step'); button.scrollIntoView({ block: 'nearest' }); }
      else button.removeAttribute('aria-current');
    });
    document.getElementById('prev').disabled = current === 0;
    syncNextLabel();
    document.getElementById('main').scrollTop = 0;
    window.scrollTo(0, 0);
    history.replaceState(null, '', '#' + (current + 1));
    if (channel) channel.postMessage({ type: 'slide', index: current });
  }

  document.getElementById('prev').addEventListener('click', backward);
  document.getElementById('next').addEventListener('click', forward);
  document.addEventListener('keydown', event => {
    if (event.target.matches('textarea,input,select') || document.getElementById('slidesMode').hidden) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !event.target.matches('button, summary, a'))) {
      event.preventDefault(); forward();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); backward(); }
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(templates.length - 1);
    else if (event.key === 's' || event.key === 'S') openSpeaker();
  });

  if (channel) channel.onmessage = ({ data }) => {
    if (data.type === 'hello') channel.postMessage({ type: 'slide', index: current });
    else if (data.type === 'go') { setMode('slides'); go(data.index); }
    else if (data.type === 'next') forward();
    else if (data.type === 'prev') backward();
  };

  function openSpeaker() {
    window.open(location.pathname + '?speaker', 'cssg-lesson4-speaker', 'width=1100,height=760');
  }
  document.getElementById('speakerBtn').addEventListener('click', openSpeaker);

  /* ---------- Modes: slides / playground / assignment ---------- */
  function setMode(mode) {
    ['slides', 'playground', 'assignment'].forEach(name =>
      document.getElementById(name + 'Mode').hidden = name !== mode);
    document.querySelectorAll('.mode-tab').forEach(button =>
      button.classList.toggle('active', button.dataset.mode === mode));
    if (mode !== 'slides') {
      if (document.fullscreenElement) document.exitFullscreen();
      document.body.classList.remove('presenting');
    }
    if (mode === 'playground') mountPlayground();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.mode-tab').forEach(button =>
    button.addEventListener('click', () => setMode(button.dataset.mode)));

  let pg = null;
  function mountPlayground() {
    if (pg) return;
    const samples = {};
    document.querySelectorAll('#pgSamples script').forEach(s => { samples[s.dataset.name] = dedent(s.textContent); });
    const select = document.getElementById('pgSample');
    pg = window.Lab.runner(samples[select.value], { file: 'playground.js', net: true });
    pg.classList.add('full');
    document.getElementById('pgHolder').append(pg);
    select.addEventListener('change', () => pg.setCode(samples[select.value]));
  }

  /* ---------- Present mode ---------- */
  const presentButton = document.getElementById('present');
  function syncPresent() {
    presentButton.innerHTML = '⛶ <span>' + (document.body.classList.contains('presenting') ? 'Exit' : 'Present') + '</span>';
  }
  presentButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      document.body.classList.toggle('presenting');
      syncPresent();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    document.body.classList.toggle('presenting', Boolean(document.fullscreenElement));
    syncPresent();
  });

  /* ---------- Assignment checklist (remembered in this browser only) ---------- */
  const KEY = 'cssg-lesson4-v2-checklist'; // v2: the tasks changed when the deck was rebuilt
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { saved = {}; }
  const boxes = [...document.querySelectorAll('#assignmentMode input[type="checkbox"]')];
  const countDone = () => {
    document.getElementById('checkCount').textContent = boxes.filter(b => b.checked).length + ' / ' + boxes.length + ' checked';
  };
  boxes.forEach((box, i) => {
    box.checked = Boolean(saved[i]);
    box.addEventListener('change', () => {
      saved[i] = box.checked;
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage unavailable */ }
      countDone();
    });
  });
  countDone();
  enhance(document.getElementById('assignmentMode'));

  const slideFromHash = () => {
    const n = parseInt(location.hash.slice(1), 10);
    return n >= 1 && n <= templates.length ? n - 1 : 0;
  };
  window.addEventListener('hashchange', () => { if (slideFromHash() !== current) go(slideFromHash()); });
  current = slideFromHash();
  render();

  /* ================================================================ */
  function speakerView() {
    document.body.className = 'speaker';
    document.title = 'Speaker view · Lesson 4';
    document.body.innerHTML =
      '<div class="speaker-view"><div class="sv-top"><span class="where"></span>' +
      '<span>ELAPSED <span class="elapsed" title="Click to restart">0:00</span></span><span class="clock"></span></div>' +
      '<div class="sv-main"><div class="sv-notes"></div><div class="sv-side">' +
      '<div class="sv-card"><div class="eyebrow">ON SCREEN</div><b class="now-title"></b><p class="now-h"></p></div>' +
      '<div class="sv-card"><div class="eyebrow">UP NEXT</div><b class="next-title"></b><p class="next-time"></p></div>' +
      '<div class="sv-card"><div class="eyebrow">KEYS</div><p>← → here drive the main window (and step through traces). Keep this window on your laptop; put the main window on the projector and press Present.</p></div>' +
      '</div></div><div class="sv-bottom"><button type="button" class="prev">← Back</button><button type="button" class="next">Next →</button></div></div>';
    const $ = sel => document.querySelector(sel);
    let start = Date.now();
    const tick = () => {
      const s = Math.floor((Date.now() - start) / 1000);
      $('.elapsed').textContent = Math.floor(s / 60) + ':' + pad(s % 60);
      $('.clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };
    setInterval(tick, 1000); tick();
    $('.elapsed').addEventListener('click', () => { start = Date.now(); tick(); });

    function show(index) {
      const t = templates[index];
      if (!t) return;
      const next = templates[index + 1];
      $('.where').textContent = 'SLIDE ' + pad(index + 1) + ' / ' + templates.length + ' · ' + (t.dataset.part || '') + ' · ' + (t.dataset.time || '');
      $('.now-title').textContent = t.dataset.title;
      const h = t.content.querySelector('h1, h2');
      $('.now-h').textContent = h ? h.textContent : '';
      $('.next-title').textContent = next ? next.dataset.title : 'End: switch to the Assignment tab';
      $('.next-time').textContent = next ? (next.dataset.time || '') + ('optional' in next.dataset ? ' · optional' : '') : '';
      const notes = $('.sv-notes');
      notes.innerHTML = '<div class="eyebrow"></div><h1></h1>';
      notes.querySelector('.eyebrow').textContent = t.dataset.label || '';
      notes.querySelector('h1').textContent = t.dataset.title;
      const found = t.content.querySelectorAll('.speaker-notes');
      if (!found.length) notes.insertAdjacentHTML('beforeend', '<p class="none">No notes for this slide.</p>');
      found.forEach(n => { const c = n.cloneNode(true); c.open = true; notes.append(c); });
      notes.scrollTop = 0;
    }

    if (!channel) {
      $('.sv-notes').innerHTML = '<p class="none">This browser can\'t talk between windows (no BroadcastChannel). Use the notes on each slide instead.</p>';
      return;
    }
    channel.onmessage = ({ data }) => { if (data.type === 'slide') show(data.index); };
    channel.postMessage({ type: 'hello' });
    $('.prev').addEventListener('click', () => channel.postMessage({ type: 'prev' }));
    $('.next').addEventListener('click', () => channel.postMessage({ type: 'next' }));
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); channel.postMessage({ type: 'next' }); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); channel.postMessage({ type: 'prev' }); }
    });
  }
})();
