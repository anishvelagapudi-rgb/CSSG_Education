/* A tiny, fake, in-browser Git: commits, branches, switch, merge, log.
   No files, no network. Just enough to watch the commit graph change.
   Usage: const sim = GitSim({ chips: ['git commit -m "x"'], tall: true, onChange(repo) {} });
          parent.append(sim.el); */
(function () {
  const LANE_COLORS = ['#52775f', '#42647c', '#965d35', '#a74e48', '#8a6d1f', '#6b5b8a'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hex = () => Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

  function tokenize(s) {
    const out = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
    return out;
  }

  function createRepo() {
    const first = { id: hex(), parents: [], msg: 'initial commit', lane: 0, i: 0 };
    return { commits: [first], branches: { main: first.id }, lanes: { main: 0 }, head: 'main', nextLane: 1 };
  }

  const byId = (r, id) => r.commits.find(c => c.id === id);
  function ancestors(r, id) {
    const seen = new Set();
    const stack = [id];
    while (stack.length) {
      const x = stack.pop();
      if (seen.has(x)) continue;
      seen.add(x);
      stack.push(...byId(r, x).parents);
    }
    return seen;
  }
  // true if commit a is an ancestor of (or the same as) commit b
  const isAnc = (r, a, b) => ancestors(r, b).has(a);

  const HELP = [
    'Commands this sandbox understands:',
    '  git status                     where am I?',
    '  git add .                      stage changes (always ready here)',
    '  git commit -m "message"        save a snapshot',
    '  git log --oneline              history of this branch',
    '  git branch                     list branches',
    '  git branch <name>              make a new label here',
    '  git switch <name>              move HEAD to a branch',
    '  git switch -c <name>           make a branch AND switch to it',
    '  git checkout [-b] <name>       the older way to do the same',
    '  git merge <name>               bring <name> into this branch',
    '  git branch -d <name>           delete a (merged) branch label',
    '  clear · reset · help'
  ].join('\n');

  function exec(r, line) {
    const ok = out => ({ out, cls: 'ok' });
    const err = out => ({ out, cls: 'err' });
    const info = out => ({ out, cls: 'info' });
    const t = tokenize(line.trim());
    if (!t.length) return null;
    if (t[0] === 'help' || (t[0] === 'git' && (t[1] === 'help' || t[1] === '--help'))) return info(HELP);
    if (t[0] === 'clear') return { clear: true };
    if (t[0] === 'reset' || t[0] === 'restart') return { reset: true };
    if (t[0] !== 'git') return err(t[0] + ': command not found (commands start with "git", or type "help")');

    const sub = t[1];
    const args = t.slice(2);
    const tip = () => r.branches[r.head];

    function create(name) {
      if (!name) return 'fatal: branch name required';
      if (!/^[\w./-]+$/.test(name) || name.startsWith('-')) return "fatal: '" + name + "' is not a valid branch name";
      if (name in r.branches) return "fatal: a branch named '" + name + "' already exists";
      r.branches[name] = tip();
      if (!(name in r.lanes)) r.lanes[name] = r.nextLane++;
      return null;
    }

    switch (sub) {
      case undefined:
        return info('usage: git <command>   (type "help" for the list)');
      case 'status':
        return info('On branch ' + r.head + '\nnothing to commit, working tree clean\n(in this sandbox your edits are always ready to commit)');
      case 'add':
        return args.length ? ok('staged ✓  Git will include these in the next commit.') : err('Nothing specified, nothing added.\nhint: maybe you wanted to say \'git add .\'?');
      case 'diff':
        return info('(no differences: the sandbox only tracks the commit graph)');
      case 'init':
        return info('Reinitialized existing Git repository (type "reset" to start over)');
      case 'commit': {
        const mi = args.findIndex(a => a === '-m' || a === '-am');
        let msg = mi >= 0 ? args[mi + 1] : null;
        if (mi >= 0 && !msg) return err("error: switch `m' requires a value");
        if (!msg) msg = 'commit #' + r.commits.length;
        const c = { id: hex(), parents: [tip()], msg, lane: r.lanes[r.head], i: r.commits.length };
        r.commits.push(c);
        r.branches[r.head] = c.id;
        return ok('[' + r.head + ' ' + c.id + '] ' + msg + '\n 1 file changed, 3 insertions(+)' + (mi < 0 ? '\n(real Git opens an editor for the message; use -m "…" to skip it)' : ''));
      }
      case 'log': {
        // Every commit reachable from HEAD, newest first (like real git log)
        const reach = ancestors(r, tip());
        const lines = r.commits.filter(c => reach.has(c.id)).sort((a, b) => b.i - a.i).map(c => {
          const labels = Object.keys(r.branches).filter(b => r.branches[b] === c.id)
            .map(b => b === r.head ? 'HEAD -> ' + b : b);
          return c.id + (labels.length ? ' (' + labels.join(', ') + ')' : '') + ' ' + c.msg;
        });
        return ok(lines.join('\n'));
      }
      case 'branch': {
        if (!args.length) return ok(Object.keys(r.branches).map(b => (b === r.head ? '* ' : '  ') + b).join('\n'));
        if (args[0] === '-d' || args[0] === '-D') {
          const n = args[1];
          if (!n) return err('fatal: branch name required');
          if (!(n in r.branches)) return err("error: branch '" + n + "' not found.");
          if (n === r.head) return err("error: Cannot delete branch '" + n + "' checked out (switch to another branch first)");
          if (args[0] === '-d' && !isAnc(r, r.branches[n], tip()))
            return err("error: The branch '" + n + "' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D " + n + "'.");
          const was = r.branches[n];
          delete r.branches[n];
          return ok('Deleted branch ' + n + ' (was ' + was + ').\n(only the label is gone: merged commits are still in history)');
        }
        const e = create(args[0]);
        return e ? err(e) : ok("Created branch '" + args[0] + "' here. You are still on '" + r.head + "'.\nhint: git switch " + args[0]);
      }
      case 'checkout':
      case 'switch': {
        const newFlag = sub === 'checkout' ? ['-b'] : ['-c', '--create'];
        if (newFlag.includes(args[0])) {
          const n = args[1];
          const e = create(n);
          if (e) return err(e);
          r.head = n;
          return ok("Switched to a new branch '" + n + "'");
        }
        const n = args[0];
        if (!n) return err('fatal: you must specify a branch to switch to');
        if (n in r.branches) {
          if (n === r.head) return info("Already on '" + n + "'");
          r.head = n;
          return ok("Switched to branch '" + n + "'");
        }
        if (r.commits.some(c => c.id.startsWith(n))) return info('Checking out a single commit is real, but this sandbox only switches between branches.');
        return err(sub === 'switch' ? 'fatal: invalid reference: ' + n : "error: pathspec '" + n + "' did not match any file(s) known to git");
      }
      case 'merge': {
        const n = args[0];
        if (!n) return err('usage: git merge <branch>');
        if (!(n in r.branches)) return err('merge: ' + n + ' - not something we can merge');
        const a = tip(), b = r.branches[n];
        if (n === r.head || isAnc(r, b, a)) return info('Already up to date.');
        if (isAnc(r, a, b)) {
          r.branches[r.head] = b;
          return ok('Updating ' + a + '..' + b + '\nFast-forward\n(' + r.head + ' had no new commits of its own, so its label just slid forward to ' + n + '. No merge commit needed.)');
        }
        const c = { id: hex(), parents: [a, b], msg: "Merge branch '" + n + "' into " + r.head, lane: r.lanes[r.head], i: r.commits.length };
        r.commits.push(c);
        r.branches[r.head] = c.id;
        return ok("Merge made by the 'ort' strategy.\n(new merge commit " + c.id + ' has two parents: the tips of ' + r.head + ' and ' + n + ')');
      }
      case 'push':
      case 'pull':
      case 'fetch':
      case 'clone':
      case 'remote':
        return info('This sandbox has no GitHub: it is just one laptop.\n`git ' + sub + '` is on the "Two people, one repo" slide.');
      default:
        return err("git: '" + sub + "' is not a git command. Type 'help'.");
    }
  }

  function graphSVG(r) {
    const COL = 58, ROW = 70, PADX = 34, PADY = 54;
    const maxLane = Math.max(0, ...r.commits.map(c => c.lane));
    const w = PADX * 2 + (r.commits.length - 1) * COL + 110;
    const h = PADY + maxLane * ROW + 40;
    const pos = c => ({ x: PADX + c.i * COL, y: PADY + c.lane * ROW });
    const color = lane => LANE_COLORS[lane % LANE_COLORS.length];
    let s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Commit graph">';

    r.commits.forEach(c => c.parents.forEach((pid, k) => {
      const p = byId(r, pid), a = pos(p), b = pos(c);
      const col = color(k === 0 ? c.lane : p.lane);
      const d = a.y === b.y ? 'M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y
        : 'M' + a.x + ' ' + a.y + ' C' + (a.x + COL * .7) + ' ' + a.y + ', ' + (b.x - COL * .7) + ' ' + b.y + ', ' + b.x + ' ' + b.y;
      s += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="3" opacity=".75"/>';
    }));

    const reachable = ancestors(r, r.branches[r.head]);
    r.commits.forEach(c => {
      const { x, y } = pos(c);
      const col = color(c.lane);
      const dim = reachable.has(c.id) ? '' : ' opacity=".55"';
      s += '<g' + dim + '><title>' + esc(c.id + ' ' + c.msg) + '</title>';
      if (c.parents.length > 1) s += '<circle cx="' + x + '" cy="' + y + '" r="15" fill="none" stroke="' + col + '" stroke-width="2"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + col + '"/>';
      s += '<text x="' + x + '" y="' + (y + 28) + '" font-size="9.5" fill="#6d736c" text-anchor="middle">' + c.id.slice(0, 5) + '</text></g>';
    });

    // Branch labels stack above their commit; the HEAD branch is filled.
    const at = {};
    Object.keys(r.branches).forEach(b => (at[r.branches[b]] = at[r.branches[b]] || []).push(b));
    Object.keys(at).forEach(id => {
      const c = byId(r, id), { x, y } = pos(c);
      at[id].sort((a, b) => (a === r.head) - (b === r.head)).forEach((b, k) => {
        const isHead = b === r.head;
        const text = isHead ? 'HEAD → ' + b : b;
        const tw = text.length * 6.6 + 14;
        const ly = y - 22 - k * 20;
        const col = color(r.lanes[b]);
        s += '<g><rect x="' + (x - tw / 2) + '" y="' + (ly - 9) + '" width="' + tw + '" height="17" rx="2" fill="' + (isHead ? col : '#fffefa') + '" stroke="' + col + '"/>' +
          '<text x="' + x + '" y="' + (ly + 3.5) + '" font-size="11" text-anchor="middle" font-weight="600" fill="' + (isHead ? '#fff' : col) + '">' + esc(text) + '</text></g>';
      });
    });
    return s + '</svg>';
  }

  window.GitSim = function ({ chips = [], tall = false, onChange = null, intro = 'Type "help" to see the commands. Try: git switch -c feature' } = {}) {
    let repo = createRepo();
    const history = [];
    let hIdx = 0;

    const el = document.createElement('div');
    el.className = 'gitsim' + (tall ? ' tall' : '');
    el.innerHTML =
      '<div class="sim-graph"></div>' +
      '<div class="sim-term"><div class="sim-out" aria-live="polite"></div>' +
      '<form class="sim-form"><span class="prompt"></span><input spellcheck="false" autocomplete="off" aria-label="Git command" placeholder="git commit -m &quot;my change&quot;"></form></div>' +
      (chips.length ? '<div class="sim-chips"></div>' : '');
    const graph = el.querySelector('.sim-graph');
    const out = el.querySelector('.sim-out');
    const input = el.querySelector('input');
    const prompt = el.querySelector('.prompt');

    function draw() {
      graph.innerHTML = graphSVG(repo);
      graph.scrollLeft = graph.scrollWidth;
      prompt.textContent = '(' + repo.head + ') $';
      if (onChange) onChange(repo);
    }
    function print(cls, text) {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      out.append(div);
      out.scrollTop = out.scrollHeight;
    }
    function run(line) {
      const res = exec(repo, line);
      if (!res) return;
      history.push(line);
      hIdx = history.length;
      if (res.clear) { out.innerHTML = ''; return; }
      if (res.reset) { repo = createRepo(); out.innerHTML = ''; print('info', 'Fresh repo: one commit on main.'); draw(); return; }
      const cmd = document.createElement('div');
      cmd.className = 'cmd';
      cmd.innerHTML = '<b>(' + esc(repo.head) + ') $</b> ' + esc(line);
      out.append(cmd);
      print(res.cls, res.out);
      draw();
    }

    el.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      run(v);
    });
    input.addEventListener('keydown', e => {
      e.stopPropagation(); // keep slide shortcuts out of the terminal
      if (e.key === 'ArrowUp' && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
      if (e.key === 'ArrowDown') { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; e.preventDefault(); }
    });
    if (chips.length) {
      const box = el.querySelector('.sim-chips');
      chips.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cmd-btn';
        b.textContent = c;
        b.addEventListener('click', () => run(c));
        box.append(b);
      });
    }
    print('info', intro);
    draw();
    return { el, run, get repo() { return repo; }, isAnc: (a, b) => isAnc(repo, a, b) };
  };
})();
