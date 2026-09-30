import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

const PASSWORD = 'test-password';
const sent = [];
let server, base, db;

before(async () => {
  db = openDatabase(':memory:');
  const mailer = { enabled: true, notifyNewMessage: async (m) => { sent.push(m); return true; } };
  const config = { adminPassword: PASSWORD, sessionSecret: 'secret', trustProxy: false };
  server = createApp({ config, db, mailer }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

function req(method, path, { body, cookie } = {}) {
  return fetch(base + path, {
    method,
    headers: { ...(body && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
    body: body && JSON.stringify(body),
  });
}

async function login() {
  const res = await req('POST', '/api/admin/login', { body: { password: PASSWORD } });
  assert.equal(res.status, 200);
  return res.headers.get('set-cookie').split(';')[0];
}

test('serves the admin page', async () => {
  const admin = await req('GET', '/admin');
  assert.equal(admin.status, 200);
  assert.match(await admin.text(), /loginForm/);
});

test('public content is seeded', async () => {
  const projects = await (await req('GET', '/api/projects')).json();
  assert.equal(projects.length, 4);
  assert.deepEqual(projects[0].tags, ['Research', 'UI']);
  assert.equal(projects[0].slug, 'paisa-budgeting-app');
  assert.equal(projects[0].published, undefined);
  assert.equal(projects[0].challenge, undefined, 'list omits case study body');

  const one = await (await req('GET', '/api/projects/paisa-budgeting-app')).json();
  assert.ok(one.approach.length > 0);
  assert.equal(one.metrics.length, 3);
  assert.equal((await req('GET', '/api/projects/nope')).status, 404);

  const testimonials = await (await req('GET', '/api/testimonials')).json();
  assert.equal(testimonials.length, 3);
});

test('contact form validates input', async () => {
  const res = await req('POST', '/api/contact', { body: { name: '', email: 'nope', message: 'short' } });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.deepEqual(Object.keys(data.fields).sort(), ['email', 'message', 'name']);

  const badTopic = await req('POST', '/api/contact', { body: { name: 'A', email: 'a@b.co', message: 'long enough message', topic: 'Hacking' } });
  assert.equal(badTopic.status, 400);
});

test('contact form rejects malformed JSON', async () => {
  const res = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Invalid JSON body.');
});

test('honeypot submissions are silently dropped', async () => {
  const before = db.prepare('SELECT COUNT(*) AS n FROM messages').get().n;
  const res = await req('POST', '/api/contact', { body: { name: 'Bot', email: 'bot@x.io', message: 'buy cheap things now', website: 'http://spam' } });
  assert.equal(res.status, 201);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM messages').get().n, before);
});

test('valid message is stored, emailed and visible to admin', async () => {
  const res = await req('POST', '/api/contact', {
    body: { name: 'Priya', email: 'priya@example.com', topic: 'UI design', budget: 'Not sure yet', message: 'We need a redesign of our onboarding.' },
  });
  assert.equal(res.status, 201);
  await new Promise((r) => setImmediate(r));
  assert.equal(sent.at(-1).name, 'Priya');

  const cookie = await login();
  const inbox = await (await req('GET', '/api/admin/messages', { cookie })).json();
  const msg = inbox.items.find((m) => m.email === 'priya@example.com');
  assert.ok(msg);
  assert.equal(msg.read_at, null);
  assert.equal(msg.emailed, true);
  assert.ok(inbox.unread >= 1);

  const read = await (await req('PATCH', `/api/admin/messages/${msg.id}`, { cookie, body: { read: true } })).json();
  assert.ok(read.read_at);

  assert.equal((await req('DELETE', `/api/admin/messages/${msg.id}`, { cookie })).status, 204);
  assert.equal((await req('DELETE', `/api/admin/messages/${msg.id}`, { cookie })).status, 404);
});

test('admin routes require a valid session', async () => {
  assert.equal((await req('GET', '/api/admin/messages')).status, 401);
  assert.equal((await req('GET', '/api/admin/messages', { cookie: 'admin_session=9999999999999.forged' })).status, 401);
  assert.equal((await req('POST', '/api/admin/login', { body: { password: 'wrong' } })).status, 401);
  assert.deepEqual(await (await req('GET', '/api/admin/me')).json(), { authed: false });
});

test('admin can create, update, hide and delete projects', async () => {
  const cookie = await login();

  const bad = await req('POST', '/api/admin/projects', { cookie, body: { title: 'X', url: 'javascript:alert(1)', theme: 's9' } });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys((await bad.json()).fields).sort(), ['theme', 'url']);

  const created = await (await req('POST', '/api/admin/projects', {
    cookie, body: { title: 'New App', category: 'Web · 2026', tags: 'UX, UI', sort_order: 10 },
  })).json();
  assert.deepEqual(created.tags, ['UX', 'UI']);
  assert.equal(created.published, true);

  const updated = await (await req('PATCH', `/api/admin/projects/${created.id}`, { cookie, body: { published: false, title: 'Renamed' } })).json();
  assert.equal(updated.title, 'Renamed');
  assert.equal(updated.category, 'Web · 2026');

  const pub = await (await req('GET', '/api/projects')).json();
  assert.ok(!pub.some((p) => p.id === created.id), 'hidden project is not public');

  assert.equal((await req('DELETE', `/api/admin/projects/${created.id}`, { cookie })).status, 204);
});

test('admin can edit testimonials', async () => {
  const cookie = await login();
  const list = await (await req('GET', '/api/admin/testimonials', { cookie })).json();
  const res = await req('PATCH', `/api/admin/testimonials/${list[0].id}`, { cookie, body: { quote: '' } });
  assert.equal(res.status, 400, 'required field cannot be blanked');

  const ok = await (await req('PATCH', `/api/admin/testimonials/${list[0].id}`, { cookie, body: { role: 'CEO, Paisa' } })).json();
  assert.equal(ok.role, 'CEO, Paisa');
  assert.equal(ok.quote, list[0].quote);
});

test('contact form is rate limited', async () => {
  let last;
  for (let i = 0; i < 6; i++) {
    last = await req('POST', '/api/contact', { body: { name: 'R', email: 'r@x.io', message: 'rate limit probe message' } });
  }
  assert.equal(last.status, 429);
  assert.ok(last.headers.get('retry-after'));
});

test('unknown API routes return JSON 404', async () => {
  const res = await req('GET', '/api/nope');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'Not found.');
});
