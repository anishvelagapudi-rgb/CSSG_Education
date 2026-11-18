/* Lesson 7 · "Access Denied": a two-team quiz for the projector.
   Teams take turns. Right answer = 100 + speed bonus. Wrong or out of time = the other team can steal for 50. */
(() => {
  const QUESTIONS = [
    { q: 'A user types their email and password to prove who they are. What is this called?', a: 'Authentication', w: ['Authorization', 'Encryption', 'Row Level Security'],
      e: 'Authenticatio<b>n</b> = ide<b>n</b>tity: who are you? Authori<b>z</b>ation is what you\'re allowed to do once we know.' },
    { q: 'Bob is logged in, but he can\'t delete Alice\'s note. Which part of security is stopping him?', a: 'Authorization', w: ['Authentication', 'CORS', 'HTTPS'],
      e: 'Bob is authenticated fine. He just isn\'t <b>authorized</b> for that row. In Supabase, that\'s an RLS policy.' },
    { q: 'Where does the Supabase SECRET key (sb_secret_…) belong?', a: 'Only in the backend .env', w: ['In frontend/.env as VITE_…', 'Committed to GitHub so teammates have it', 'In localStorage'],
      e: 'The secret key skips RLS: full admin. Every <code>VITE_</code> variable ships to every visitor\'s browser, so it can never go there.' },
    { q: 'Your publishable key is in your frontend code where anyone can see it. When is that OK?', a: 'When every table has RLS on', w: ['Never: rotate it now', 'Only if the repo is private', 'Only on localhost'],
      e: 'The publishable key can only do what your policies allow. A table with RLS <b>off</b> is wide open to anyone holding it.' },
    { q: 'Can anyone read what\'s inside a JWT (the user id, email, expiry)?', a: 'Yes, it\'s only base64-encoded', w: ['No, it\'s encrypted', 'Only the server can', 'Only with the secret key'],
      e: 'The payload is readable by anyone. The <b>signature</b> is what stops people faking it. So never put secrets in a token.' },
    { q: 'A hacker edits the "sub" inside their token to Alice\'s id and sends it. What happens?', a: '401: the signature no longer matches', w: ['They see Alice\'s notes', 'Supabase re-signs it for them', 'Nothing; sub is ignored'],
      e: 'Changing any part of the payload breaks the signature. Making a new valid one needs Supabase\'s private key.' },
    { q: 'How should the frontend send the login token to your Express API?', a: 'Authorization: Bearer <token>', w: ['?token=<token> in the URL', 'In the request body as "password"', 'It doesn\'t; the server remembers'],
      e: 'The standard header. URLs end up in logs and browser history, so tokens don\'t go there.' },
    { q: 'RLS is ON. There are NO policies. Alice runs select * from notes. What does she get?', a: '[] an empty list, no error', w: ['Every row', 'An error: permission denied', 'Only her own rows'],
      e: 'RLS fails <b>closed</b> and <b>quietly</b>. No policy = no rows. An empty list after enabling RLS usually means a missing SELECT policy.' },
    { q: 'Which of these skips RLS completely?', a: 'The secret key (sb_secret_…)', w: ['The publishable key', 'A logged-in user\'s token', 'The JWKS URL'],
      e: 'That\'s why our backend uses <code>supabaseAs(req.token)</code> for user data: the secret key would ignore every policy.' },
    { q: 'Inside a policy, what does auth.uid() return?', a: 'The id of the logged-in user making the request', w: ['The id of the table\'s owner', 'A random new uuid', 'The project id'],
      e: 'It\'s the <code>sub</code> from the token. If nobody is logged in, it\'s <code>null</code>, so <code>auth.uid() = user_id</code> is never true.' },
    { q: 'Which policy stops a user from inserting a note with someone else\'s user_id?', a: 'with check (auth.uid() = user_id)', w: ['using (true)', 'with check (true)', 'No policy needed'],
      e: '<b>WITH CHECK</b> tests the new row. <code>true</code> would let anyone post “as Alice”.' },
    { q: 'Delete policy is owner-only. Bob runs delete on Alice\'s note. What happens?', a: '0 rows deleted, and no error', w: ['An error: forbidden', 'The note is deleted', 'Bob gets logged out'],
      e: 'To Bob, Alice\'s row doesn\'t exist, so the WHERE matches nothing. That\'s why our route checks <code>data.length === 0</code> and returns 404.' },
    { q: 'In your Express route, where should the user\'s id come from?', a: 'The verified token (req.user.id)', w: ['req.body.user_id', 'A cookie the frontend sets', 'A query parameter ?user=…'],
      e: 'Anything in the request body or URL can be typed by the user. Only the verified token is trustworthy, and with <code>default auth.uid()</code> you don\'t even need to send it.' },
    { q: 'A request arrives with no token at all. What status should your API return?', a: '401 Unauthorized', w: ['403 Forbidden', '404 Not Found', '200 with an empty list'],
      e: '<code>401</code> = we don\'t know who you are (authentication). <code>403</code> = we know, and the answer is no (authorization).' },
    { q: 'Alice\'s access token expires after an hour. What happens in her browser?', a: 'supabase-js refreshes it automatically', w: ['She is logged out every hour', 'The token works forever anyway', 'Your server makes a new one'],
      e: 'The refresh token gets a fresh access token in the background. Short-lived tokens limit the damage if one leaks.' },
    { q: 'You accidentally pushed your secret key to GitHub. What do you do first?', a: 'Rotate the key in Supabase now', w: ['Delete the commit and hope', 'Make the repo private', 'Nothing; nobody reads commits'],
      e: 'Bots scan GitHub for keys within minutes. Deleting the commit isn\'t enough: make a new key, and the old one stops working.' }
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
      '<div class="team-inputs"><label>Team 1<input id="t0" value="Team Token" maxlength="20"></label><label>Team 2<input id="t1" value="Team Policy" maxlength="20"></label></div>' +
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
    const head = a === b ? 'It\'s a tie. Access granted to both teams!' : (a > b ? g.names[0] : g.names[1]) + ' wins!';
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
