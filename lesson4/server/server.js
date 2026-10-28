#!/usr/bin/env node
/* The class guestbook server. No install needed, just Node:

     node lesson4/server/server.js            (port 3000)
     PORT=4000 node lesson4/server/server.js
     POSTS_PER_MINUTE=30 node lesson4/server/server.js   (if the class shares one IP)

   Everyone on the same Wi-Fi can reach it at the LAN address it prints.
   Open that address in a browser for the live view to put on the projector.
   Data lives in memory: restarting the server resets the guestbook. */
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const Guestbook = require('./guestbook.js');

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 10 * 1024;
const book = Guestbook.create({ postsPerMinute: Number(process.env.POSTS_PER_MINUTE) || undefined });
const viewer = path.join(__dirname, 'viewer.html');

const COLORS = { GET: 32, HEAD: 32, POST: 34, PUT: 33, PATCH: 33, DELETE: 31, OPTIONS: 90 };
const paint = (code, text) => process.stdout.isTTY ? '\x1b[' + code + 'm' + text + '\x1b[0m' : text;

// Let pages on any origin (the slides, students' own projects) read our answers.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hello',
  'Access-Control-Expose-Headers': 'Location, Retry-After, X-Total-Count, Allow'
};

function send(res, status, headers, body) {
  res.writeHead(status, Object.assign({}, CORS, headers));
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const client = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const started = Date.now();
  res.on('finish', () => {
    if (url.pathname === '/log' || req.headers['x-viewer'] || url.pathname === '/favicon.ico' || (url.pathname === '/' && req.method === 'GET' && wantsPage(req))) return;
    const s = res.statusCode;
    console.log(
      new Date().toLocaleTimeString(), paint(COLORS[req.method] || 0, req.method.padEnd(7)),
      (url.pathname + url.search).padEnd(28), paint(s >= 500 ? 35 : s >= 400 ? 31 : 32, String(s)),
      paint(90, client + ' · ' + (Date.now() - started) + 'ms'));
  });

  // The browser asks permission before a cross-origin PATCH or DELETE ("preflight").
  if (req.method === 'OPTIONS') return send(res, 204, { Allow: CORS['Access-Control-Allow-Methods'] });

  if (url.pathname === '/favicon.ico') return send(res, 204, {});

  // A person in a browser gets the live view; curl and fetch get JSON.
  if (url.pathname === '/' && req.method === 'GET' && wantsPage(req)) {
    return fs.readFile(viewer, (err, html) => err
      ? send(res, 500, { 'Content-Type': 'text/plain' }, 'viewer.html is missing')
      : send(res, 200, { 'Content-Type': 'text/html; charset=utf-8' }, html));
  }

  let body = '';
  let tooBig = false;
  req.setEncoding('utf8');
  req.on('data', chunk => {
    body += chunk;
    if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
  });
  req.on('end', () => {
    if (tooBig) return send(res, 413, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Bodies are limited to 10 KB.' }));
    let out;
    try {
      out = book.handle({
        method: req.method, path: url.pathname, search: url.search,
        query: Object.fromEntries(url.searchParams), headers: req.headers, body, client
      });
    } catch (err) {
      console.error(err);
      out = { status: 500, headers: {}, body: { error: 'The server broke. Not your fault!' } };
    }
    const headers = Object.assign({}, out.headers);
    if (out.body !== null) headers['Content-Type'] = 'application/json; charset=utf-8';
    const text = out.body === null ? '' : JSON.stringify(out.body, null, 2) + '\n';
    setTimeout(() => send(res, out.status, headers, req.method === 'HEAD' ? undefined : text), out.delay || 0);
  });
});

function wantsPage(req) {
  return /text\/html/.test(req.headers.accept || '');
}

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => 'http://' + i.address + ':' + PORT);
  console.log('\nCS + SG class guestbook is running.\n');
  console.log('  On this computer:   http://localhost:' + PORT);
  lan.forEach(u => console.log('  Same Wi-Fi:         ' + u));
  console.log('\n  Open it in a browser for the live view. Every request shows up below.\n');
});
