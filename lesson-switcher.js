/* Shared lesson switcher. Every lesson page loads this with
   <script src="../lesson-switcher.js"></script>. To add a lesson, add it to LESSONS. */
(function () {
  var LESSONS = [
    { n: 1, title: 'Build Minesweeper' },
    { n: 2, title: 'HTML & CSS' },
    { n: 3, title: 'React + TypeScript' },
    { n: 4, title: 'Async, HTTP & fetch' },
    { n: 4, dir: 'lesson4-short', tag: '4·40', title: 'Async & fetch · 40 min' }
  ];
  LESSONS.forEach(function (l) { l.dir = l.dir || 'lesson' + l.n; l.tag = l.tag || String(l.n); });

  var match = location.pathname.match(/\/(lesson[\w-]+)\//);
  var current = null;
  LESSONS.forEach(function (l) { if (match && l.dir === match[1]) current = l; });

  var css =
    '.topbar-left{display:flex;align-items:center;gap:16px;min-width:0}' +
    '.topbar{z-index:30}' +
    '.lesson-switch{position:relative}' +
    '.lesson-switch-btn{display:flex;align-items:center;gap:7px;border:1px solid var(--line,#d7d3c8);background:var(--panel,#fffefa);color:var(--text,#1e2723);border-radius:2px;padding:6px 10px;font:500 11px var(--mono,monospace);letter-spacing:.06em;cursor:pointer;white-space:nowrap}' +
    '.lesson-switch-btn:hover,.lesson-switch.open .lesson-switch-btn{border-color:currentColor}' +
    '.lesson-switch-btn .caret{font-size:9px;transition:transform .15s}' +
    '.lesson-switch.open .caret{transform:rotate(180deg)}' +
    '.lesson-switch-menu{position:absolute;top:calc(100% + 6px);left:0;min-width:230px;margin:0;padding:6px;list-style:none;background:var(--panel,#fffefa);border:1px solid var(--line,#d7d3c8);border-radius:3px;box-shadow:0 10px 30px rgba(0,0,0,.12)}' +
    '.lesson-switch-menu a{display:flex;gap:10px;align-items:baseline;padding:8px 10px;border-radius:2px;color:var(--text,#1e2723);text-decoration:none;font:500 14px var(--sans,sans-serif)}' +
    '.lesson-switch-menu a:hover,.lesson-switch-menu a:focus{background:rgba(127,127,127,.12);outline:none}' +
    '.lesson-switch-menu a[aria-current] {font-weight:700}' +
    '.lesson-switch-menu .num{font:500 10px var(--mono,monospace);letter-spacing:.08em;opacity:.65;min-width:30px}' +
    '@media(max-width:580px){.lesson-switch-btn .label{display:none}.brand small{display:none}}';

  function build() {
    var brand = document.querySelector('.topbar .brand');
    if (!brand) return;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'lesson-switch';
    wrap.innerHTML =
      '<button type="button" class="lesson-switch-btn" aria-haspopup="true" aria-expanded="false">' +
      '<span class="label">' + (current ? 'LESSON ' + current.tag : 'LESSONS') + '</span>' +
      '<span class="caret">▼</span></button>' +
      '<ul class="lesson-switch-menu" hidden>' +
      LESSONS.map(function (l) {
        return '<li><a href="../' + l.dir + '/"' + (l === current ? ' aria-current="page"' : '') + '>' +
          '<span class="num">L' + l.tag + '</span><span>' + l.title.replace(/&/g, '&amp;') + '</span></a></li>';
      }).join('') +
      '<li><a href="../index.html"><span class="num">↩</span><span>All lessons</span></a></li>' +
      '</ul>';

    // Keep the topbar at three flex children: [brand + switcher] [tabs] [meta]
    var left = document.createElement('div');
    left.className = 'topbar-left';
    brand.parentNode.insertBefore(left, brand);
    left.appendChild(brand);
    left.appendChild(wrap);

    var btn = wrap.querySelector('button');
    var menu = wrap.querySelector('ul');
    function setOpen(open) {
      menu.hidden = !open;
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) (menu.querySelector('[aria-current]') || menu.querySelector('a')).focus();
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) setOpen(false); });
    // Stop slide-deck keyboard shortcuts while the menu is in use
    wrap.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(menu.querySelectorAll('a'));
      var i = links.indexOf(document.activeElement);
      if (e.key === 'Escape') { setOpen(false); btn.focus(); }
      else if (!menu.hidden && e.key === 'ArrowDown') { links[(i + 1) % links.length].focus(); e.preventDefault(); }
      else if (!menu.hidden && e.key === 'ArrowUp') { links[(i - 1 + links.length) % links.length].focus(); e.preventDefault(); }
      e.stopPropagation();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
