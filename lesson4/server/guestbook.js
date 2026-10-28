/* The class guestbook: every rule the practice server enforces, in one place.
   server.js wraps it in a real HTTP server; the slides' "offline copy" runs the
   same code in the browser, so both answer exactly the same way.

   handle({ method, path, query, headers, body, client }) → { status, headers, body, delay }
   - headers: lower-case names (x-viewer: the live view's own polling, left out of the log)
   - body (request): the raw text, or '' when there is none
   - body (response): a plain object (sent as JSON), or null for no body */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Guestbook = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LIMITS = { name: 50, message: 280, postsPerMinute: 5, list: 100 };
  const STATUS_TEXT = {
    200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized',
    403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 413: 'Payload Too Large',
    415: 'Unsupported Media Type', 418: "I'm a teapot", 429: 'Too Many Requests',
    500: 'Internal Server Error', 503: 'Service Unavailable'
  };

  const token = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

  function create(options = {}) {
    const perMinute = options.postsPerMinute || LIMITS.postsPerMinute;
    let nextId = 1;
    const entries = [];
    const recentPosts = new Map(); // client → timestamps of their recent POSTs
    const log = [];

    function add(name, message, minutesAgo) {
      const entry = { id: nextId++, name, message, likes: 0, createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString(), editToken: token() };
      entries.push(entry);
      return entry;
    }
    add('Ava', 'cool site!', 120);
    add('Jordan', 'love the projects section', 45);
    add('CS + SG', 'Welcome! GET me, then POST your own entry.', 5);

    const reply = (status, body = null, headers = {}) => ({ status, statusText: STATUS_TEXT[status] || '', headers, body });
    const fail = (status, error, hint, headers) => reply(status, hint ? { error, hint } : { error }, headers);
    // Visitors never see the edit token, only the person who created the entry.
    const pub = ({ editToken, ...rest }) => rest;

    function parseBody(req) {
      if (!req.body) return { error: fail(400, 'This request needs a JSON body.', 'curl: add -d \'{"name":"…","message":"…"}\'') };
      const type = (req.headers['content-type'] || '').split(';')[0].trim();
      if (type !== 'application/json') {
        return { error: fail(415, 'Send JSON, and say so in a header. Got Content-Type: ' + (type || '(none)') + '.', 'curl: add -H "Content-Type: application/json"') };
      }
      try {
        const data = JSON.parse(req.body);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object');
        return { data };
      } catch {
        return { error: fail(400, 'The body is not valid JSON: ' + String(req.body).slice(0, 60), 'Windows PowerShell strips the quotes. Use Git Bash, or put the JSON in a file and send -d @entry.json') };
      }
    }

    // Shared by POST, PUT and PATCH. `need` lists the fields that must be present.
    function validate(data, need) {
      const fields = ['name', 'message'];
      const unknown = Object.keys(data).filter(k => !fields.includes(k));
      if (unknown.length) return 'Unknown field: ' + unknown.join(', ') + '. Only name and message can be set.';
      for (const f of need) if (!(f in data)) return 'Missing field: ' + f + '.';
      for (const f of fields) {
        if (!(f in data)) continue;
        if (typeof data[f] !== 'string' || !data[f].trim()) return f + ' must be a non-empty string.';
        if (data[f].length > LIMITS[f]) return f + ' is ' + data[f].length + ' characters. The limit is ' + LIMITS[f] + '.';
      }
      return null;
    }

    // 401: you didn't say who you are. 403: you did, and it's not your entry.
    function authorize(req, entry) {
      const auth = req.headers.authorization || '';
      if (!auth) return fail(401, 'Only the person who wrote entry ' + entry.id + ' can change it. Who are you?', 'curl: add -H "Authorization: Bearer <your editToken>"');
      const m = auth.match(/^Bearer\s+(\S+)$/i);
      if (!m) return fail(401, 'The Authorization header should look like: Bearer <editToken>');
      if (m[1] !== entry.editToken) return fail(403, 'That token is not the one for entry ' + entry.id + '. You can only change your own.');
      return null;
    }

    const notAllowed = allow => fail(405, 'That method does not work here. Allowed: ' + allow.join(', ') + '.', null, { Allow: allow.join(', ') });

    function route(req) {
      const method = req.method.toUpperCase();
      const path = req.path.replace(/\/+$/, '') || '/';
      const q = req.query || {};
      let m;

      if (path === '/entries') {
        if (method === 'GET') {
          const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), LIMITS.list);
          let list = entries.slice().reverse();
          if (q.name) list = list.filter(e => e.name.toLowerCase() === String(q.name).toLowerCase());
          return reply(200, list.slice(0, limit).map(pub), { 'X-Total-Count': String(entries.length) });
        }
        if (method === 'POST') {
          const now = Date.now();
          const recent = (recentPosts.get(req.client) || []).filter(t => now - t < 60000);
          if (recent.length >= perMinute) {
            const wait = Math.ceil((60000 - (now - recent[0])) / 1000);
            return fail(429, 'Slow down: ' + perMinute + ' posts a minute, max.', null, { 'Retry-After': String(wait) });
          }
          const { data, error } = parseBody(req);
          if (error) return error;
          const problem = validate(data, ['name', 'message']);
          if (problem) return fail(400, problem);
          recent.push(now);
          recentPosts.set(req.client, recent);
          const entry = add(data.name.trim(), data.message.trim(), 0);
          return reply(201, Object.assign({}, entry, { note: 'Save your editToken: you need it to change or delete this entry.' }), { Location: '/entries/' + entry.id });
        }
        return notAllowed(['GET', 'POST']);
      }

      if ((m = path.match(/^\/entries\/([^/]+)$/))) {
        const entry = entries.find(e => String(e.id) === m[1]);
        const allow = ['GET', 'PUT', 'PATCH', 'DELETE'];
        if (!allow.includes(method)) return notAllowed(allow);
        if (!entry) return fail(404, 'There is no entry ' + m[1] + '. Maybe it was deleted?');
        if (method === 'GET') return reply(200, pub(entry));
        const denied = authorize(req, entry);
        if (denied) return denied;
        if (method === 'DELETE') {
          entries.splice(entries.indexOf(entry), 1);
          return reply(204);
        }
        const { data, error } = parseBody(req);
        if (error) return error;
        // PUT replaces the whole entry, so it needs every field. PATCH changes only what you send.
        const problem = validate(data, method === 'PUT' ? ['name', 'message'] : []);
        if (problem) return fail(400, method === 'PUT' ? problem + ' PUT replaces the whole entry: send name AND message (or use PATCH).' : problem);
        if (!Object.keys(data).length) return fail(400, 'Nothing to change. Send name and/or message.');
        if ('name' in data) entry.name = data.name.trim();
        if ('message' in data) entry.message = data.message.trim();
        return reply(200, pub(entry));
      }

      if ((m = path.match(/^\/entries\/([^/]+)\/likes$/))) {
        const entry = entries.find(e => String(e.id) === m[1]);
        if (method !== 'POST') return notAllowed(['POST']);
        if (!entry) return fail(404, 'There is no entry ' + m[1] + '.');
        entry.likes++;
        return reply(201, { id: entry.id, likes: entry.likes });
      }

      if (path === '/echo') {
        return reply(200, { youSent: { method, path: req.path, query: q, headers: req.headers, body: req.body || null } });
      }

      if ((m = path.match(/^\/status\/(\d{3})$/))) {
        const code = Number(m[1]);
        if (code < 200 || code > 599) return fail(400, 'Pick a code from 200 to 599.');
        return code === 204 ? reply(204) : reply(code, { status: code, meaning: STATUS_TEXT[code] || 'look it up!' });
      }

      if (path === '/slow') {
        const ms = Math.min(Math.max(parseInt(q.ms, 10) || 2000, 0), 10000);
        return Object.assign(reply(200, { waited: ms }), { delay: ms });
      }

      if (path === '/log' && method === 'GET') return reply(200, log.slice(-40).reverse());

      if (path === '/' || path === '/help') {
        return reply(200, {
          hello: 'This is the CS + SG class guestbook. Try these:',
          endpoints: [
            'GET    /entries            newest 20 (?limit=5, ?name=Ava)',
            'GET    /entries/:id        one entry',
            'POST   /entries            {"name","message"} → 201 + your editToken',
            'PUT    /entries/:id        replace name AND message (needs your token)',
            'PATCH  /entries/:id        change name and/or message (needs your token)',
            'DELETE /entries/:id        delete it (needs your token)',
            'POST   /entries/:id/likes  +1 like',
            'ANY    /echo               shows exactly what you sent',
            'GET    /status/:code       answers with that status code',
            'GET    /slow?ms=2000       answers after a delay'
          ]
        });
      }

      return fail(404, 'No such endpoint: ' + req.path + '. Try GET / for the list.');
    }

    function handle(req) {
      const method = req.method.toUpperCase();
      const isHead = method === 'HEAD';
      const res = route(Object.assign({}, req, { method: isHead ? 'GET' : method, headers: req.headers || {} }));
      if (isHead) res.body = null; // HEAD: the same headers as GET, no body
      if (req.path !== '/log' && !req.headers['x-viewer']) {
        log.push({ at: new Date().toISOString(), method, path: req.path + (req.search || ''), status: res.status, client: req.client || '' });
        if (log.length > 200) log.shift();
      }
      return res;
    }

    return { handle, entries };
  }

  return { create, LIMITS, STATUS_TEXT };
});
