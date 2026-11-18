/* Lesson 7 · Auth & Supabase RLS. Slide engine + the interactive diagrams. */
(() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const store = {
    get(k) { try { return localStorage.getItem('cssg-lesson7-' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('cssg-lesson7-' + k, v); } catch (e) { /* private mode */ } }
  };
  const flash = (el, cls = 'flash') => { el.classList.remove('flash', 'bad'); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); };

  /* =========================================================
     Tiny syntax highlighter for code snippets
     ========================================================= */
  const KW_JS = 'import|from|export|default|const|let|async|await|function|return|if|else|try|catch|new|type|typeof|throw';
  const KW_SQL = 'create|table|alter|enable|row|level|security|policy|on|for|to|using|with|check|grant|select|insert|update|delete|references|default|not|null|primary|key|generated|always|as|identity|or|and|if|exists|cascade|from|where|uuid|bigint|text|boolean|timestamptz';
  function highlight(code, lang) {
    let re;
    if (lang === 'sql') re = new RegExp("(--[^\\n]*)|('[^'\\n]*')|\\b(" + KW_SQL + ")\\b", 'gi');
    else if (lang === 'env') re = /(#[^\n]*)/g;
    else re = new RegExp("(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|('(?:[^'\\\\\\n]|\\\\.)*'|\"(?:[^\"\\\\\\n]|\\\\.)*\"|`(?:[^`\\\\]|\\\\.)*`)|\\b(" + KW_JS + ")\\b", 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      out += '<span class="' + (m[1] ? 'tk-c' : m[2] ? 'tk-s' : 'tk-k') + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  function copyText(text, btn) {
    const done = () => { btn.textContent = 'COPIED ✓'; setTimeout(() => (btn.textContent = 'COPY'), 1400); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
      ta.remove();
    }
  }

  /* =========================================================
     Widget 1 · How login works (step through)
     ========================================================= */
  function loginDemo() {
    const steps = [
      { on: ['browser'], route: 'START', packet: 'Alice opens your-app.vercel.app',
        state: { browser: '<span class="c">localStorage:</span>\n  (empty)\n<span class="e">not logged in</span>', api: '<span class="c">waiting for requests</span>', sb: '<span class="c">auth.users:</span>\n  alice@school.edu\n  password: <span class="c">(stored as a hash)</span>' },
        note: 'Alice already has an account. Supabase stores a <b>hash</b> of her password, never the password itself.' },
      { on: ['browser', 'sb'], route: 'BROWSER → SUPABASE AUTH', packet: 'supabase.auth.signInWithPassword({ email, password })\n\nPOST https://xyz.supabase.co/auth/v1/token\n{ "email": "alice@school.edu", "password": "hunter2" }',
        note: 'The login form sends the password <b>straight to Supabase</b>. It never goes through your Express server, so your code can never leak it.' },
      { on: ['sb', 'browser'], route: 'SUPABASE AUTH → BROWSER', packet: '200 OK\n{\n  "access_token": "eyJhbGciOiJFUzI1NiIs…",   ← the JWT\n  "expires_in": 3600,\n  "refresh_token": "v8k2…",\n  "user": { "id": "a1b2c3d4-…", "email": "alice@school.edu" }\n}',
        state: { sb: '<span class="c">auth.users:</span>\n  alice@school.edu\n  hash matches <span class="g">✓</span>\n<span class="g">signs a JWT with its PRIVATE key</span>' },
        note: 'Password correct. Supabase makes a <b>JWT</b>: a note that says “this is user a1b2…, valid for 1 hour”, <b>signed</b> with a private key that never leaves Supabase.' },
      { on: ['browser'], route: 'IN THE BROWSER', packet: 'localStorage["sb-xyz-auth-token"] = { access_token, refresh_token, user, … }',
        state: { browser: '<span class="c">localStorage:</span>\n  access_token: eyJhbG…\n  refresh_token: v8k2…\n<span class="g">logged in as alice ✓</span>' },
        note: 'supabase-js saves the session. That is all “logged in” means: <b>the browser is holding a valid token</b>.' },
      { on: ['browser', 'api'], route: 'BROWSER → YOUR API', packet: 'GET https://your-api.onrender.com/api/notes\nAuthorization: Bearer eyJhbGciOiJFUzI1NiIs…',
        note: 'Every request to your API carries the token in the <code>Authorization</code> header. Your <code>api.ts</code> adds it.' },
      { on: ['api'], route: 'YOUR API · requireUser()', packet: 'jwtVerify(token, JWKS)\n  signature matches Supabase\'s PUBLIC key   ✓\n  exp 14:32 is after now (13:47)            ✓\n→ req.user = { id: "a1b2c3d4-…" }',
        state: { api: '<span class="g">requireUser ✓</span>\nreq.user.id = a1b2…\nreq.token   = eyJhbG…' },
        note: 'Your API checks the <b>signature</b> with Supabase\'s <b>public</b> keys (the JWKS, downloaded once). No database call, no password needed. Making a valid signature needs the private key.' },
      { on: ['api', 'sb'], route: 'YOUR API → POSTGRES (as Alice)', packet: 'select * from notes;\n-- sent with Alice\'s token, so inside Postgres auth.uid() = \'a1b2…\'\n-- her RLS policy quietly adds:   where auth.uid() = user_id',
        state: { sb: '<span class="c">notes: 5 rows total</span>\nRLS: auth.uid() = user_id\n<span class="g">→ keeps Alice\'s 2 rows</span>' },
        note: 'Your API <b>forwards the token</b> to Supabase. <b>Postgres itself</b> applies the RLS policy, so only Alice\'s rows come out. That\'s part 2 of today.' },
      { on: ['sb', 'api', 'browser'], route: 'POSTGRES → API → BROWSER', packet: '200 OK\n[ { "id": 1, "body": "Grocery list: milk, eggs" },\n  { "id": 2, "body": "Club meeting moved to Friday" } ]',
        state: { browser: '<span class="c">localStorage:</span>\n  access_token: eyJhbG…\n<span class="g">shows 2 notes</span>' },
        note: 'Alice sees her 2 notes, not all 5. Your route code didn\'t filter anything.' },
      { on: [], bad: ['api'], route: 'SOMEONE ELSE → YOUR API', routeBad: true, packet: 'GET https://your-api.onrender.com/api/notes\n(no Authorization header, or a made-up token)\n\n401 Unauthorized\n{ "error": "Not logged in" }',
        state: { api: '<span class="e">requireUser ✗ → 401</span>\n<span class="c">the database is never touched</span>' },
        note: 'No token, or a fake one? <code>requireUser</code> stops it with a <b>401</b> before it gets anywhere near the database.' }
    ];
    const states = [];
    steps.forEach((s, i) => {
      const prev = states[i - 1] || { state: {} };
      states.push(Object.assign({}, s, { state: Object.assign({}, prev.state, s.state) }));
    });

    const box = document.createElement('div');
    box.className = 'flowdemo';
    const col = (k, name, sub, ico, color) =>
      '<div class="fd-box" data-b="' + k + '"><h3><span class="ico" style="background:' + color + '">' + ico + '</span>' + name + '</h3><div class="sub">' + sub + '</div><div class="state"></div></div>';
    box.innerHTML =
      '<div class="fd-cols">' +
      col('browser', 'Browser', 'your React app · Vercel', '◧', '#52775f') +
      col('api', 'Your API', 'Express · Render', '⇄', '#965d35') +
      col('sb', 'Supabase', 'Auth + Postgres', '⛁', '#42647c') +
      '</div>' +
      '<div class="fd-packet"><div class="fd-route"></div><pre></pre></div>' +
      '<p class="team-note"></p>' +
      '<div class="team-ctrl"><button class="arrow-button" data-a="back">◀</button><span class="count"></span><button class="next-button" data-a="next">Step ▶</button><button class="arrow-button" data-a="reset" title="Back to the start">⏮</button></div>';

    let at = 0;
    function draw(animate) {
      const s = states[at];
      ['browser', 'api', 'sb'].forEach(k => {
        const el = box.querySelector('[data-b="' + k + '"]');
        el.querySelector('.state').innerHTML = s.state[k] || '';
        const on = s.on.includes(k), bad = (s.bad || []).includes(k);
        el.classList.toggle('on', on && !bad);
        el.classList.toggle('bad', bad);
        el.classList.toggle('dim', !on && !bad);
      });
      const route = box.querySelector('.fd-route');
      route.textContent = s.route;
      route.classList.toggle('bad', !!s.routeBad);
      box.querySelector('.fd-packet pre').textContent = s.packet;
      box.querySelector('.team-note').innerHTML = s.note;
      box.querySelector('.count').textContent = (at + 1) + ' / ' + states.length;
      box.querySelector('[data-a="back"]').disabled = at === 0;
      box.querySelector('[data-a="next"]').disabled = at === states.length - 1;
      if (animate) flash(box.querySelector('.fd-packet'));
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
     Widget 2 · Inside a JWT (try to tamper with it)
     ========================================================= */
  function jwtDemo() {
    const b64 = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const iat = Math.floor(Date.now() / 1000);
    const header = { alg: 'ES256', typ: 'JWT', kid: '6a8f2c' };
    const original = { sub: 'a1b2c3d4-alice', email: 'alice@school.edu', role: 'authenticated', aud: 'authenticated', iat: iat, exp: iat + 3600 };
    const SIG = 'Xq3V9mN2kLpR7tYc0aWfE8sBjH4uG6dZ1oKiQ5vMxTnS3yA_bC-eF2gJ8hL0wP9rU';
    const hhmm = t => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let payload, clock;
    const reset = () => { payload = Object.assign({}, original); clock = iat; };
    reset();

    const box = document.createElement('div');
    box.className = 'jwt';
    box.innerHTML =
      '<div class="window-label"><span>Authorization: Bearer …</span><span>header . payload . signature</span></div>' +
      '<div class="jwt-token"></div>' +
      '<div class="jwt-cols">' +
      '<div class="jwt-part h"><h4>HEADER</h4><pre class="ph"></pre><p class="hint" style="margin-top:6px">How it was signed.</p></div>' +
      '<div class="jwt-part p"><h4>PAYLOAD · “CLAIMS”</h4><pre class="pp"></pre></div>' +
      '<div class="jwt-part s"><h4>SIGNATURE</h4><p>Made from header + payload using Supabase\'s <b>private</b> key. Your backend checks it with the <b>public</b> key.</p><p class="hint" style="margin-top:8px">Server clock: <b class="clock"></b></p></div>' +
      '</div>' +
      '<div class="btn-row">' +
      '<button class="cmd-btn plain" data-a="bob">✎ Pretend to be Bob (change sub)</button>' +
      '<button class="cmd-btn plain" data-a="admin">✎ Become admin (role: service_role)</button>' +
      '<button class="cmd-btn plain" data-a="wait">⏱ Wait 1 hour</button>' +
      '<button class="cmd-btn plain" data-a="reset" title="Start over">↺ Reset</button>' +
      '</div>' +
      '<div class="jwt-verdict"></div>';

    function draw() {
      const changed = Object.keys(payload).filter(k => payload[k] !== original[k]);
      const tampered = changed.length > 0;
      box.querySelector('.jwt-token').innerHTML =
        '<span class="h">' + b64(header) + '</span><span class="d">.</span><span class="p' + (tampered ? ' changed' : '') + '">' + b64(payload) + '</span><span class="d">.</span><span class="s">' + SIG + '</span>';
      box.querySelector('.ph').textContent = JSON.stringify(header, null, 2);
      box.querySelector('.pp').innerHTML = '{\n' + Object.keys(payload).map(k => {
        let line = '  "' + k + '": ' + JSON.stringify(payload[k]);
        if (k === 'iat') line += '   // issued ' + hhmm(payload.iat);
        if (k === 'exp') line += '   // expires ' + hhmm(payload.exp);
        return changed.includes(k) ? '<span class="chg">' + esc(line) + '</span>' : esc(line);
      }).join(',\n') + '\n}';
      box.querySelector('.clock').textContent = hhmm(clock);
      const v = box.querySelector('.jwt-verdict');
      if (tampered) {
        v.className = 'jwt-verdict bad';
        v.innerHTML = '<b>✗ 401 · INVALID SIGNATURE</b>You changed <code>' + changed.join(', ') + '</code>, so the payload no longer matches the signature. Making a new valid signature needs Supabase\'s private key, which you don\'t have.';
      } else if (clock >= payload.exp) {
        v.className = 'jwt-verdict bad';
        v.innerHTML = '<b>✗ 401 · TOKEN EXPIRED</b>The signature is fine, but <code>exp</code> is in the past. In a real app supabase-js would already have swapped it for a fresh one using the refresh token.';
      } else {
        v.className = 'jwt-verdict good';
        v.innerHTML = '<b>✓ VALID</b>Signed by Supabase and not expired. This request is from <b>alice@school.edu</b> (<code>sub</code> = ' + esc(payload.sub) + ').';
      }
    }
    const actions = {
      bob() { payload.sub = 'e5f6a7b8-bob'; payload.email = 'bob@school.edu'; },
      admin() { payload.role = 'service_role'; },
      wait() { clock += 3600; },
      reset
    };
    box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { actions[b.dataset.a](); draw(); flash(box.querySelector('.jwt-verdict')); }));
    draw();
    return box;
  }

  /* =========================================================
     Widget 3 · RLS lab: a fake notes table with real-ish rules
     ========================================================= */
  const USERS = {
    alice: { name: 'Alice', color: '#52775f', uid: 'a1b2…' },
    bob: { name: 'Bob', color: '#42647c', uid: 'e5f6…' },
    cara: { name: 'Cara', color: '#965d35', uid: 'c9d0…' }
  };
  const ACTORS = [
    { k: 'anon', name: 'Not logged in', ico: '?', color: '#8e958c' },
    { k: 'alice', name: 'Alice', ico: 'A', color: USERS.alice.color },
    { k: 'bob', name: 'Bob', ico: 'B', color: USERS.bob.color },
    { k: 'secret', name: 'Secret key', ico: '⚿', color: '#a74e48' }
  ];
  const RULES = {
    select: [['none', 'No policy · nobody'], ['all', 'Everyone · using (true)'], ['loggedin', 'Any logged-in user'], ['owner', 'Owner only'], ['ownerOrPublic', 'Owner, or the note is public']],
    insert: [['none', 'No policy · nobody'], ['all', 'Anyone · with check (true)'], ['loggedin', 'Any logged-in user, any user_id'], ['owner', 'Only as yourself']],
    update: [['none', 'No policy · nobody'], ['all', 'Everyone · using (true)'], ['loggedin', 'Any logged-in user'], ['owner', 'Owner only']],
    delete: [['none', 'No policy · nobody'], ['all', 'Everyone · using (true)'], ['loggedin', 'Any logged-in user'], ['owner', 'Owner only']]
  };
  const START_ROWS = [
    { id: 1, owner: 'alice', body: 'Grocery list: milk, eggs', pub: false },
    { id: 2, owner: 'alice', body: 'Club meeting moved to Friday', pub: true },
    { id: 3, owner: 'bob', body: 'My diary. Do not read.', pub: false },
    { id: 4, owner: 'bob', body: 'Robotics sign-up link', pub: true },
    { id: 5, owner: 'cara', body: 'Essay draft v3', pub: false }
  ];

  function policySQL(op, rule) {
    const who = rule === 'loggedin' || rule === 'owner' ? 'authenticated' : 'anon, authenticated';
    const head = '<span class="k">create policy</span> "' + op + '" <span class="k">on</span> notes\n  <span class="k">for</span> ' + op + ' <span class="k">to</span> ' + who + '\n  ';
    const own = 'auth.uid() = user_id';
    if (rule === 'none') return '<span class="c">-- ' + op + ': no policy, so nobody can ' + op + ' (except the secret key)</span>';
    const expr = rule === 'owner' ? own : rule === 'ownerOrPublic' ? 'is_public or ' + own : 'true';
    if (op === 'insert') return head + '<span class="k">with check</span> (' + expr + ');';
    if (op === 'update') return head + '<span class="k">using</span> (' + expr + ')' + (rule === 'owner' ? '\n  <span class="k">with check</span> (' + own + ')' : '') + ';';
    return head + '<span class="k">using</span> (' + expr + ');';
  }

  function rlsLab(opts = {}) {
    const st = { rls: false, pol: { select: 'none', insert: 'none', update: 'none', delete: 'none' }, actor: 'alice', rows: [], events: new Set(), nextId: 6 };
    const resetRows = () => { st.rows = START_ROWS.map(r => Object.assign({}, r)); st.nextId = 6; };
    resetRows();

    const box = document.createElement('div');
    box.className = 'lab' + (opts.compact ? ' compact' : '');
    box.innerHTML =
      '<div>' +
      '<div class="lab-sub">The rules · table <code>notes</code></div>' +
      '<div class="rls-switch"><div><b>Row Level Security</b><small class="rls-state"></small></div><button class="toggle" aria-label="Toggle row level security"></button></div>' +
      Object.keys(RULES).map(op => '<div class="pol"><label>' + op.toUpperCase() + '</label><select data-op="' + op + '" aria-label="' + op + ' policy">' + RULES[op].map(r => '<option value="' + r[0] + '">' + esc(r[1]) + '</option>').join('') + '</select></div>').join('') +
      '<div class="lab-sql"></div>' +
      '</div>' +
      '<div>' +
      '<div class="lab-sub">Who is asking?</div>' +
      '<div class="actors">' + ACTORS.map(a => '<button class="actor" data-actor="' + a.k + '"><span class="ico" style="background:' + a.color + '">' + a.ico + '</span>' + a.name + '</button>').join('') + '</div>' +
      '<table class="notes-table"><thead><tr><th>id</th><th>user_id</th><th>body</th><th class="hide-sm">public</th><th>visible?</th><th></th></tr></thead><tbody></tbody></table>' +
      '<div class="ins-row"><button class="cmd-btn" data-ins="own">insert my own note</button><button class="cmd-btn" data-ins="forge">insert a note as someone else</button><button class="cmd-btn plain" data-ins="reset" title="Put the rows back">↺ reset rows</button></div>' +
      '<p class="seen"></p>' +
      '<div class="term-line"><span class="i">Pick who is asking, then click edit / delete / insert. Faded rows are invisible to that user.</span></div>' +
      '</div>';

    const term = box.querySelector('.term-line');
    const say = (sql, text, cls = '') => {
      const who = ACTORS.find(a => a.k === st.actor).name.toLowerCase();
      term.innerHTML = '<span class="p">' + esc(who) + '=&gt; ' + esc(sql) + '</span>\n<span class="' + cls + '">' + esc(text) + '</span>';
    };

    const pass = (rule, row) => {
      const a = st.actor;
      if (rule === 'all') return true;
      if (rule === 'loggedin') return a !== 'anon';
      if (rule === 'owner') return a !== 'anon' && row.owner === a;
      if (rule === 'ownerOrPublic') return row.pub || (a !== 'anon' && row.owner === a);
      return false;
    };
    const bypass = () => st.actor === 'secret' || !st.rls;
    const can = (op, row) => bypass() || pass(st.pol[op], row);

    function draw() {
      box.querySelector('.toggle').classList.toggle('on', st.rls);
      box.querySelector('.rls-state').textContent = st.rls ? 'ON · only rows a policy allows' : 'OFF · policies are ignored, everything is open';
      box.querySelectorAll('select').forEach(s => (s.value = st.pol[s.dataset.op]));
      box.querySelectorAll('.actor').forEach(b => b.classList.toggle('on', b.dataset.actor === st.actor));
      const sql = [st.rls
        ? '<span class="k">alter table</span> notes <span class="k">enable row level security</span>;'
        : '<span class="w">-- RLS is OFF: anyone with your publishable key\n-- can read and change every row.</span>\n<span class="k">alter table</span> notes <span class="k">disable row level security</span>;'];
      if (st.rls) Object.keys(RULES).forEach(op => sql.push(policySQL(op, st.pol[op])));
      box.querySelector('.lab-sql').innerHTML = sql.join('\n\n');

      const tb = box.querySelector('tbody');
      tb.innerHTML = st.rows.map(r => {
        const vis = can('select', r);
        const u = USERS[r.owner];
        return '<tr data-id="' + r.id + '" class="' + (vis ? '' : 'hidden-row') + '">' +
          '<td>' + r.id + '</td>' +
          '<td>' + (u ? '<span class="ico" style="background:' + u.color + ';width:18px;height:18px;font-size:10px">' + u.name[0] + '</span> ' + u.name : '<code>null</code>') + '</td>' +
          '<td class="body">' + esc(r.body) + '</td>' +
          '<td class="hide-sm">' + (r.pub ? '<span class="pub">public</span>' : '') + '</td>' +
          '<td><span class="vis ' + (vis ? 'yes' : 'no') + '">' + (vis ? 'VISIBLE' : 'HIDDEN') + '</span></td>' +
          '<td><div class="row-btns"><button class="mini" data-act="edit" data-id="' + r.id + '">edit</button><button class="mini danger" data-act="delete" data-id="' + r.id + '">delete</button></div></td></tr>';
      }).join('');
      const n = st.rows.filter(r => can('select', r)).length;
      box.querySelector('.seen').innerHTML = '<b>select * from notes;</b> → ' + n + ' of ' + st.rows.length + ' rows' + (st.actor === 'secret' ? ' (the secret key skips RLS)' : !st.rls ? ' (RLS is off)' : '');
      if (opts.onChange) opts.onChange(st);
    }

    function rowAction(act, id) {
      const row = st.rows.find(r => r.id === id);
      const op = act === 'edit' ? 'update' : 'delete';
      const sql = act === 'edit' ? 'update notes set body = \'…\' where id = ' + id + ';' : 'delete from notes where id = ' + id + ';';
      const tag = act === 'edit' ? 'UPDATE' : 'DELETE';
      // A row the user can't SELECT doesn't exist as far as their query is concerned
      if (!can('select', row)) {
        say(sql, tag + ' 0   ← no error! You can\'t see row ' + id + ', so the WHERE matched nothing.', 'i');
        noteBlocked(row);
      } else if (!can(op, row)) {
        say(sql, tag + ' 0   ← no error! You can see row ' + id + ', but no ' + op.toUpperCase() + ' policy lets you change it.', 'i');
        noteBlocked(row);
      } else {
        if (act === 'edit') row.body = row.body.replace(/ \(edited.*\)$/, '') + ' (edited by ' + ACTORS.find(a => a.k === st.actor).name + ')';
        else st.rows = st.rows.filter(r => r !== row);
        say(sql, tag + ' 1' + (row.owner !== st.actor && st.actor !== 'secret' ? '   ← that wasn\'t your note!' : ''), row.owner !== st.actor && st.actor !== 'secret' ? 'e' : '');
        if (st.actor === 'anon') st.events.add('anonChanged');
      }
      draw();
      const tr = box.querySelector('tr[data-id="' + id + '"]');
      if (tr) flash(tr);
    }
    function noteBlocked(row) {
      if (st.actor === 'bob' && row.owner === 'alice') st.events.add('bobBlocked');
    }

    function insert(kind) {
      if (kind === 'reset') { resetRows(); say('-- reset', 'Rows put back the way they started.', 'i'); return draw(); }
      const a = st.actor;
      const self = a === 'alice' || a === 'bob' ? a : null;
      const owner = kind === 'own' ? self : (a === 'alice' ? 'bob' : 'alice');
      const row = { id: st.nextId, owner, body: kind === 'own' ? 'New note' : 'I am ' + USERS[owner].name + ', trust me', pub: false };
      const sql = kind === 'own' ? 'insert into notes (body) values (\'New note\');  -- user_id defaults to auth.uid()' : 'insert into notes (body, user_id) values (\'…\', \'' + USERS[owner].uid + '\');';
      if (!bypass() && !pass(st.pol.insert, row)) {
        say(sql, 'ERROR: new row violates row-level security policy for table "notes"', 'e');
        if (kind === 'forge') st.events.add('forgeBlocked');
        return draw();
      }
      if (!owner) {
        say(sql, 'ERROR: null value in column "user_id" violates not-null constraint\n' + (a === 'secret' ? '(the secret key isn\'t a user, so auth.uid() is null)' : '(not logged in, so auth.uid() is null)'), 'e');
        return draw();
      }
      st.rows.push(row);
      st.nextId++;
      if (kind === 'forge') st.events.add('forgeAllowed');
      say(sql, 'INSERT 1' + (kind === 'forge' && a !== 'secret' ? '   ← you just posted as ' + USERS[owner].name + '!' : ''), kind === 'forge' && a !== 'secret' ? 'e' : '');
      draw();
    }

    box.querySelector('.toggle').addEventListener('click', () => { st.rls = !st.rls; draw(); });
    box.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { st.pol[s.dataset.op] = s.value; draw(); }));
    box.querySelectorAll('.actor').forEach(b => b.addEventListener('click', () => {
      st.actor = b.dataset.actor;
      if (st.actor === 'secret') st.events.add('secret');
      draw();
    }));
    box.querySelector('tbody').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b) rowAction(b.dataset.act, +b.dataset.id);
    });
    box.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => insert(b.dataset.ins)));
    draw();
    return box;
  }

  /* =========================================================
     Annotated policy
     ========================================================= */
  const ANNO = {
    name: ['A LABEL', 'Just a name for humans. It shows up in the dashboard under Authentication → Policies, so make it say what the rule does.'],
    on: ['THE TABLE', 'The table this rule protects. RLS must also be switched on for it: <code>alter table notes enable row level security;</code> Without that, policies do nothing.'],
    for: ['WHICH COMMAND', '<code>select</code>, <code>insert</code>, <code>update</code>, <code>delete</code>, or <code>all</code>. One policy per command is easiest to read. If several policies match, a row is allowed if <b>any</b> of them allows it.'],
    to: ['WHO IT APPLIES TO', 'A Postgres role. <code>anon</code> = requests with no login, <code>authenticated</code> = logged-in users. Leave it out and it applies to everyone.'],
    using: ['WHICH EXISTING ROWS', 'For rows that already exist: which ones may this user pick? Here, only rows whose <code>user_id</code> is the id in their token. Every other row is invisible, so updating it changes 0 rows.'],
    check: ['WHAT THE NEW ROW MUST LOOK LIKE', 'Checked on the row <b>after</b> the change. Stops Alice from setting <code>user_id</code> to Bob\'s id. If it fails: <code>new row violates row-level security policy</code>.']
  };

  /* =========================================================
     Hydrate a slide (or page)
     ========================================================= */
  function hydrate(root) {
    root.querySelectorAll('[data-widget]').forEach(el => {
      const w = el.dataset.widget;
      let node = null;
      if (w === 'login') node = loginDemo();
      if (w === 'jwt') node = jwtDemo();
      if (w === 'lab') node = rlsLab({ compact: true });
      if (node) el.replaceWith(node);
    });
    root.querySelectorAll('pre.snip').forEach(p => { if (!p.dataset.done) { p.innerHTML = highlight(p.textContent, p.dataset.lang); p.dataset.done = '1'; } });
    root.querySelectorAll('.qcard').forEach(c => c.addEventListener('click', () => c.classList.toggle('open')));
    root.querySelectorAll('.anno').forEach(a => {
      const detail = a.nextElementSibling;
      a.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        a.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        const d = ANNO[b.dataset.k];
        detail.innerHTML = '<b>' + d[0] + '</b><p>' + d[1] + '</p>';
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
  const total = templates.reduce((a, t) => a + minutes(t), 0);
  document.getElementById('totalTime').textContent = total + ' MIN';
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
    document.getElementById('progress').style.width = (elapsed / total * 100) + '%';
    nav.querySelectorAll('.nav-item').forEach((b, k) => b.classList.toggle('active', k === current));
    document.getElementById('prev').disabled = current === 0;
    document.getElementById('next').disabled = current === templates.length - 1;
    store.set('slide', current);
    history.replaceState(null, '', '#' + (current + 1));
  }
  // → first steps the login demo, then moves on
  function next() {
    const demo = slide.querySelector('.flowdemo');
    if (demo && demo.step(1)) return;
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

  /* ---------- Modes: slides / lab / game / kit ---------- */
  const modes = { slides: 'slidesMode', lab: 'labMode', game: 'gameMode', kit: 'kitMode' };
  let mode = 'slides';
  function setMode(m) {
    mode = m;
    Object.keys(modes).forEach(k => (document.getElementById(modes[k]).hidden = k !== m));
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
    document.body.classList.remove('presenting');
    if (m === 'kit') loadKit();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.mode-tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

  document.addEventListener('keydown', e => {
    if (mode !== 'slides' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) && e.key === ' ') return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
    else if (e.key === 'f' || e.key === 'F') togglePresent();
    else if (e.key === 'Escape' && document.body.classList.contains('presenting')) togglePresent();
  });

  /* ---------- Policy Lab page with self-checking challenges ---------- */
  const CHALLENGES = [
    ['Turn RLS <b>on</b> with no policies. As Alice, how many notes can you see?', s => s.rls],
    ['Make each user see <b>only their own</b> notes. Check as Alice, then Bob.', s => s.rls && (s.pol.select === 'owner' || s.pol.select === 'ownerOrPublic')],
    ['Also let <b>logged-out</b> visitors see public notes (and nothing else).', s => s.rls && s.pol.select === 'ownerOrPublic'],
    ['As Bob, try to <b>delete one of Alice\'s</b> notes. Did you get an error?', s => s.events.has('bobBlocked')],
    ['Let users add notes, but block <b>“insert a note as someone else”</b>. Test it.', s => s.rls && s.pol.insert === 'owner' && s.events.has('forgeBlocked')],
    ['Users can <b>edit and delete only their own</b> notes.', s => s.rls && s.pol.update === 'owner' && s.pol.delete === 'owner'],
    ['Switch to the <b>secret key</b>. Why must it never be in the browser?', s => s.events.has('secret')]
  ];
  const list = document.getElementById('challengeList');
  list.innerHTML = CHALLENGES.map(c => '<li><span class="box">✓</span><span>' + c[0] + '</span></li>').join('');
  document.getElementById('labHolder').append(rlsLab({
    onChange(s) { list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('done', !!CHALLENGES[i][1](s))); }
  }));

  /* ---------- Starter Code page: load the real files ---------- */
  let kitLoaded = false;
  function loadKit() {
    if (kitLoaded) return;
    kitLoaded = true;
    const toc = document.getElementById('kitToc');
    toc.innerHTML = [...document.querySelectorAll('.kit-step')].map(s =>
      '<a href="#' + s.id + '">' + esc(s.querySelector('h3').textContent.replace(/^(STEP \d|HELP)/, '$1 · ')) + '</a>').join('');
    toc.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    document.querySelectorAll('#kit .file').forEach(f => {
      const src = f.dataset.src;
      const lang = /\.sql$/.test(src) ? 'sql' : /\.env/.test(src) ? 'env' : 'js';
      const tag = f.dataset.tag || '';
      f.innerHTML = '<div class="file-name"><span>' + esc(f.dataset.name) + '</span><span class="' + (/NEW/.test(tag) ? 'tag-new' : 'tag-rep') + '">' + esc(tag) + '</span></div>' +
        '<div class="file-wrap"><pre class="snip">loading…</pre><button class="copy-btn">COPY</button></div>';
      const pre = f.querySelector('pre');
      const btn = f.querySelector('.copy-btn');
      fetch(src).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(text => {
        pre.innerHTML = highlight(text, lang);
        btn.addEventListener('click', () => copyText(text, btn));
      }).catch(() => {
        pre.textContent = 'Could not load ' + src + '.\nOpen this page through a web server (python3 -m http.server from the repo root),\nor open the file directly: lesson7--FINAL/' + src;
        btn.hidden = true;
      });
    });
    document.querySelectorAll('.checklist input').forEach(cb => {
      cb.checked = store.get('check-' + cb.id) === '1';
      cb.addEventListener('change', () => store.set('check-' + cb.id, cb.checked ? '1' : '0'));
    });
  }

  /* ---------- Start ---------- */
  const fromHash = parseInt(location.hash.slice(1), 10);
  const saved = parseInt(store.get('slide'), 10);
  go(fromHash ? fromHash - 1 : (saved || 0));
  window.Deck = { setMode };
})();
