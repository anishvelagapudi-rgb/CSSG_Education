// Runnable code for lesson 4.
// - Lab.highlight(code, marks)   read-only syntax highlighting, one <span class="ln"> per line
// - Lab.runner(code, opts)       editable JS + a console that stamps each line with ms since ▶ run
// - Lab.fetch(url, init)         real fetch, or a canned offline copy of the lesson's APIs
// No build step, no TypeScript: the lesson is about what plain JS does at run time.
(function (root) {
  const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- Syntax highlighting ---------- */
  const KEYWORDS = /^(import|from|export|default|function|return|const|let|var|if|else|for|of|in|new|true|false|null|undefined|typeof|while|async|await|try|catch|finally|throw|class|this)$/;
  const TOKENS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(=>)|\b([A-Za-z_$][\w$]*)\b(?=\()|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/g;

  function hlJs(code) {
    let out = '', last = 0, m;
    TOKENS.lastIndex = 0;
    while ((m = TOKENS.exec(code))) {
      out += esc(code.slice(last, m.index));
      last = TOKENS.lastIndex;
      const [all, com, str, arrow, call, num, word] = m;
      if (com) out += '<span class="t-com">' + esc(com) + '</span>';
      else if (str) out += '<span class="t-str">' + esc(str) + '</span>';
      else if (arrow) out += '<span class="t-kw">=&gt;</span>';
      else if (call) out += KEYWORDS.test(call) ? '<span class="t-kw">' + call + '</span>' : '<span class="t-fn">' + call + '</span>';
      else if (num) out += '<span class="t-num">' + num + '</span>';
      else if (word) out += KEYWORDS.test(word) ? '<span class="t-kw">' + word + '</span>'
        : /^[A-Z]/.test(word) ? '<span class="t-comp">' + word + '</span>' : esc(word);
      else out += esc(all);
    }
    return out + esc(code.slice(last));
  }

  // Highlight the whole file, then cut it into lines (so multi-line comments still work).
  function highlight(code, marks) {
    const lines = [];
    let open = [];
    hlJs(code).split('\n').forEach(line => {
      let text = open.join('') + line;
      (line.match(/<span[^>]*>|<\/span>/g) || []).forEach(t => { if (t === '</span>') open.pop(); else open.push(t); });
      lines.push(text + '</span>'.repeat(open.length));
    });
    return lines.map((line, i) =>
      '<span class="ln' + (marks && marks.has(i + 1) ? ' mark' : '') + '">' + (line || ' ') + '</span>').join('');
  }

  /* ---------- Printing values the way DevTools roughly does ---------- */
  function show(value, depth = 0) {
    if (typeof value === 'string') return depth ? JSON.stringify(value) : value;
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return 'ƒ ' + (value.name || 'anonymous') + '()';
    if (value instanceof Error) return value.name + ': ' + value.message;
    if (value instanceof Promise) return 'Promise {…}';
    if (typeof Response !== 'undefined' && value instanceof Response)
      return 'Response { status: ' + value.status + ', ok: ' + value.ok + ', url: "' + value.url + '" }';
    if (value && typeof value === 'object') {
      if (depth > 2) return Array.isArray(value) ? '[…]' : '{…}';
      if (Array.isArray(value)) {
        const items = value.slice(0, 8).map(v => show(v, depth + 1));
        if (value.length > 8) items.push('… ' + (value.length - 8) + ' more');
        return '[' + items.join(', ') + ']';
      }
      const keys = Object.keys(value);
      const parts = keys.slice(0, 8).map(k => k + ': ' + show(value[k], depth + 1));
      if (keys.length > 8) parts.push('… ' + (keys.length - 8) + ' more');
      return '{ ' + parts.join(', ') + ' }';
    }
    return String(value);
  }

  /* ---------- Network: real, or an offline copy of the lesson's endpoints ---------- */
  const NET_KEY = 'cssg-lesson4-short-net';
  let netMode = 'live';
  try { netMode = localStorage.getItem(NET_KEY) || 'live'; } catch { /* storage unavailable */ }
  const listeners = new Set();
  function setNet(mode) {
    netMode = mode;
    try { localStorage.setItem(NET_KEY, mode); } catch { /* storage unavailable */ }
    listeners.forEach(fn => fn(mode));
  }

  const sprite = id => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + id + '.png';
  const POKEMON = {
    pikachu: { id: 25, height: 4, weight: 60, types: ['electric'] },
    bulbasaur: { id: 1, height: 7, weight: 69, types: ['grass', 'poison'] },
    charmander: { id: 4, height: 6, weight: 85, types: ['fire'] },
    squirtle: { id: 7, height: 5, weight: 90, types: ['water'] },
    eevee: { id: 133, height: 3, weight: 65, types: ['normal'] },
    snorlax: { id: 143, height: 21, weight: 4600, types: ['normal'] },
    mew: { id: 151, height: 4, weight: 40, types: ['psychic'] }
  };
  const USERS = [
    { id: 1, name: 'Leanne Graham', username: 'Bret', email: 'Sincere@april.biz' },
    { id: 2, name: 'Ervin Howell', username: 'Antonette', email: 'Shanna@melissa.tv' },
    { id: 3, name: 'Clementine Bauch', username: 'Samantha', email: 'Nathan@yesenia.net' }
  ];
  const POSTS = [
    { userId: 1, id: 1, title: 'sunt aut facere repellat provident occaecati', body: 'quia et suscipit…' },
    { userId: 1, id: 2, title: 'qui est esse', body: 'est rerum tempore vitae…' },
    { userId: 1, id: 3, title: 'ea molestias quasi exercitationem', body: 'et iusto sed quo iure…' },
    { userId: 2, id: 11, title: 'et ea vero quia laudantium autem', body: 'delectus reiciendis…' }
  ];

  const STATUS_TEXT = { 200: 'OK', 201: 'Created', 404: 'Not Found' };
  function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, statusText: STATUS_TEXT[status], headers: { 'Content-Type': 'application/json' } });
  }

  function route(url, init) {
    const u = new URL(url, location.href);
    const method = (init && init.method || 'GET').toUpperCase();
    const path = u.pathname.replace(/\/$/, '');
    if (u.hostname === 'pokeapi.co') {
      const m = path.match(/^\/api\/v2\/pokemon\/([^/]+)$/);
      const p = m && (POKEMON[m[1].toLowerCase()] || Object.entries(POKEMON).map(([name, v]) => Object.assign({ name }, v)).find(v => String(v.id) === m[1]));
      if (!p) return new Response('Not Found', { status: 404, statusText: 'Not Found' });
      const name = p.name || m[1].toLowerCase();
      return json({ id: p.id, name, height: p.height, weight: p.weight,
        types: p.types.map((t, i) => ({ slot: i + 1, type: { name: t } })),
        sprites: { front_default: sprite(p.id) } });
    }
    if (u.hostname === 'jsonplaceholder.typicode.com') {
      let m;
      if (path === '/users') return json(USERS);
      if ((m = path.match(/^\/users\/(\d+)$/))) {
        const user = USERS.find(x => x.id === Number(m[1]));
        return user ? json(user) : json({}, 404);
      }
      if (path === '/posts' && method === 'POST') {
        let body = {};
        try { body = JSON.parse(init.body || '{}'); } catch { /* not JSON */ }
        return json(Object.assign(body, { id: 101 }), 201);
      }
      if (path === '/posts') {
        const userId = u.searchParams.get('userId');
        return json(userId ? POSTS.filter(p => String(p.userId) === userId) : POSTS);
      }
      if ((m = path.match(/^\/posts\/(\d+)$/))) {
        const post = POSTS.find(x => x.id === Number(m[1]));
        if (method === 'DELETE') return json({}, 200);
        return post ? json(post) : json({}, 404);
      }
      if ((m = path.match(/^\/todos\/(\d+)$/))) return json({ userId: 1, id: Number(m[1]), title: 'delectus aut autem', completed: false });
      return json({}, 404);
    }
    return null;
  }

  // Offline: wait like a real network would, then answer from the table above.
  // Unknown hosts fail the way a dead network does: fetch rejects with a TypeError.
  function mockFetch(url, init = {}) {
    return new Promise((resolve, reject) => {
      const delay = 150 + Math.random() * 450;
      const timer = setTimeout(() => {
        const res = route(String(url), init);
        if (!res) reject(new TypeError('Failed to fetch'));
        else {
          Object.defineProperty(res, 'url', { value: new URL(String(url), location.href).href });
          resolve(res);
        }
      }, delay);
      if (init.signal) init.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('The user aborted a request.', 'AbortError'));
      });
    });
  }

  const labFetch = (url, init) => netMode === 'mock' ? mockFetch(url, init) : fetch(url, init);

  /* ---------- Runner: editable code + timestamped console ---------- */
  // Only the runner that ran most recently gets “uncaught (in promise)” errors.
  let lastRun = null;
  window.addEventListener('unhandledrejection', event => {
    if (!lastRun || !lastRun.isConnected) return;
    event.preventDefault();
    lastRun.print('error', ['Uncaught (in promise) ' + show(event.reason)]);
  });

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  function runner(code, { marks = null, file = 'script.js', net = false, stack = false, big = false, autorun = false } = {}) {
    const box = document.createElement('div');
    box.className = 'runner' + (stack ? ' stack' : '') + (big ? ' big' : '');
    box.innerHTML =
      '<div class="r-editor"><div class="r-tools"><span class="file"></span>' +
      (net ? '<select data-net title="Where fetch goes"><option value="live">network: live</option><option value="mock">network: offline copy</option></select>' : '') +
      '<button type="button" data-run>▶ run <small>ctrl+enter</small></button><button type="button" data-reset>reset</button></div>' +
      '<div class="r-code"><pre aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div></div>' +
      '<div class="console"><div class="console-head"><span>CONSOLE · ms since ▶ run</span><button type="button">clear</button></div><div class="console-body"></div></div>';
    box.querySelector('.file').textContent = file;
    const pre = box.querySelector('pre');
    const ta = box.querySelector('textarea');
    const body = box.querySelector('.console-body');
    const original = code.replace(/\n$/, '');
    let current = original;
    let runId = 0;
    let started = 0;

    function paint() {
      pre.innerHTML = highlight(current, current === original ? marks : null);
      const lines = current.split('\n').length;
      box.querySelector('.r-code').style.minHeight = Math.min(Math.max(lines * 22 + 24, 140), 520) + 'px';
    }
    ta.value = current;
    paint();
    ta.addEventListener('input', () => { current = ta.value; paint(); });
    ta.addEventListener('scroll', () => { pre.style.transform = 'translate(' + -ta.scrollLeft + 'px,' + -ta.scrollTop + 'px)'; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText('  ', s, ta.selectionEnd, 'end');
        current = ta.value; paint();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
      e.stopPropagation(); // arrow keys move the caret, not the slides
    });

    function print(kind, args, id = runId) {
      if (id !== runId) return; // a timer from an older run: ignore it
      const line = document.createElement('div');
      line.className = 'log ' + kind;
      const ms = document.createElement('span');
      ms.className = 'ms';
      ms.textContent = '+' + Math.round(performance.now() - started) + 'ms';
      line.append(ms, document.createTextNode(args.map(a => show(a)).join(' ')));
      body.append(line);
      body.scrollTop = body.scrollHeight;
    }
    box.print = (kind, args) => print(kind, args);

    async function run() {
      const id = ++runId;
      body.innerHTML = '';
      started = performance.now();
      lastRun = box;
      const con = {
        log: (...a) => print('', a, id), info: (...a) => print('info', a, id),
        warn: (...a) => print('warn', a, id), error: (...a) => print('error', a, id),
        table: (...a) => print('', a, id)
      };
      try {
        const fn = new AsyncFunction('console', 'fetch', current);
        await fn(con, labFetch);
      } catch (err) {
        print('error', ['Uncaught ' + show(err)], id);
      }
    }

    box.querySelector('[data-run]').addEventListener('click', run);
    box.querySelector('[data-reset]').addEventListener('click', () => {
      runId++; current = original; ta.value = current; paint(); body.innerHTML = '';
    });
    box.querySelector('.console-head button').addEventListener('click', () => { body.innerHTML = ''; });
    const select = box.querySelector('[data-net]');
    if (select) {
      select.value = netMode;
      select.addEventListener('change', () => setNet(select.value));
      const sync = mode => { if (!box.isConnected) listeners.delete(sync); else select.value = mode; };
      listeners.add(sync);
    }
    box.setCode = text => { runId++; current = text.replace(/\n$/, ''); ta.value = current; paint(); body.innerHTML = ''; };
    if (autorun) setTimeout(run, 0);
    return box;
  }

  root.Lab = { esc, highlight, show, runner, fetch: labFetch, mockFetch, setNet, net: () => netMode, onNet: fn => listeners.add(fn) };
})(window);
