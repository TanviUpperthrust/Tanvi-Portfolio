import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

const PASSWORD = 'test-password';
let server, base, db;

before(async () => {
  db = openDatabase(':memory:');
  const mailer = { enabled: false, notifyNewMessage: async () => false };
  const config = { adminPassword: PASSWORD, sessionSecret: 'secret', trustProxy: false, siteUrl: 'https://tanvi.example' };
  server = createApp({ config, db, mailer }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

function req(method, p, { body, cookie } = {}) {
  return fetch(base + p, {
    method,
    headers: { ...(body && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
    body: body && JSON.stringify(body),
  });
}

async function login() {
  const res = await req('POST', '/api/admin/login', { body: { password: PASSWORD } });
  return res.headers.get('set-cookie').split(';')[0];
}

test('home page is server-rendered from the database', async () => {
  const res = await req('GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const page = await res.text();
  assert.match(page, /id="contactForm"/);
  assert.match(page, /href="\/work\/paisa-budgeting-app"/);
  assert.match(page, /Open to new projects · 2026/);
  assert.match(page, /4<sup>\+<\/sup>/, 'stat "+" renders as superscript');
  assert.match(page, /she <em>rethought<\/em> how/, 'first testimonial rendered with emphasis');
  assert.match(page, /id="quotesData"/);
  assert.match(page, /<link rel="canonical" href="https:\/\/tanvi.example\/"/);
  assert.doesNotMatch(page, /<script>/, 'no inline scripts');
  assert.doesNotMatch(page, /class="socials/, 'empty social links are hidden');
});

test('CSP forbids inline scripts', async () => {
  const csp = (await req('GET', '/')).headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'(;|$)/);
});

test('case study page renders every section', async () => {
  const res = await req('GET', '/work/carelink-dashboard');
  assert.equal(res.status, 200);
  const page = await res.text();
  assert.match(page, /<title>CareLink Dashboard · Case study by Tanvi<\/title>/);
  assert.match(page, /The <span class="serif">challenge/);
  assert.match(page, /The <span class="serif">approach/);
  assert.match(page, /<ul><li>/, 'bullet lines become a list');
  assert.match(page, /6 → 2/);
  assert.match(page, /Next case study/);
  assert.match(page, /href="\/work\/chai-and-co-ordering"/, 'links to the next project');
  assert.match(page, /og:type" content="article"/);
});

test('unknown pages and hidden projects get the styled 404', async () => {
  const res = await req('GET', '/work/does-not-exist');
  assert.equal(res.status, 404);
  const page = await res.text();
  assert.match(page, /wrong turn/);
  assert.match(page, /name="robots" content="noindex"/);

  assert.equal((await req('GET', '/some/random/page')).status, 404);

  const cookie = await login();
  const [orbit] = (await (await req('GET', '/api/admin/projects', { cookie })).json()).filter((p) => p.slug === 'orbit-saas-analytics');
  await req('PATCH', `/api/admin/projects/${orbit.id}`, { cookie, body: { published: false } });
  assert.equal((await req('GET', '/work/orbit-saas-analytics')).status, 404);
  const sitemap = await (await req('GET', '/sitemap.xml')).text();
  assert.doesNotMatch(sitemap, /orbit/);
  await req('PATCH', `/api/admin/projects/${orbit.id}`, { cookie, body: { published: true } });
});

test('sitemap, robots and static assets', async () => {
  const sitemap = await req('GET', '/sitemap.xml');
  assert.match(sitemap.headers.get('content-type'), /xml/);
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https:\/\/tanvi.example\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/tanvi.example\/work\/paisa-budgeting-app<\/loc>/);

  const robots = await (await req('GET', '/robots.txt')).text();
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Sitemap: https:\/\/tanvi.example\/sitemap.xml/);

  for (const p of ['/assets/css/site.css', '/assets/js/site.js', '/assets/js/home.js', '/assets/js/admin.js', '/favicon.svg']) {
    assert.equal((await req('GET', p)).status, 200, p);
  }
  assert.equal((await req('GET', '/index.html')).status, 404, 'no stale static home page');
});

test('admin edits to content escape HTML on the rendered page', async () => {
  const cookie = await login();
  const created = await (await req('POST', '/api/admin/projects', {
    cookie,
    body: { title: '<img src=x onerror=alert(1)>: Evil', summary: '"><script>alert(1)</script>', challenge: '<b>bold</b> *fine*', sort_order: 99 },
  })).json();
  assert.equal(created.slug, 'img-src-x-onerror-alert-1-evil');

  const page = await (await req('GET', `/work/${created.slug}`)).text();
  assert.doesNotMatch(page, /<img src=x/);
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(page, /&lt;b&gt;bold&lt;\/b&gt; <em>fine<\/em>/);

  await req('DELETE', `/api/admin/projects/${created.id}`, { cookie });
});

test('project slugs: generated, deduplicated, validated', async () => {
  const cookie = await login();
  const a = await (await req('POST', '/api/admin/projects', { cookie, body: { title: 'Paisa: Budgeting App' } })).json();
  assert.equal(a.slug, 'paisa-budgeting-app-2', 'duplicate title gets a suffix');

  const clash = await req('PATCH', `/api/admin/projects/${a.id}`, { cookie, body: { slug: 'carelink-dashboard' } });
  assert.equal(clash.status, 400);
  assert.ok((await clash.json()).fields.slug);

  const bad = await req('PATCH', `/api/admin/projects/${a.id}`, { cookie, body: { slug: 'Has Spaces' } });
  assert.equal(bad.status, 400);

  const renamed = await (await req('PATCH', `/api/admin/projects/${a.id}`, { cookie, body: { slug: 'my-new-page' } })).json();
  assert.equal(renamed.slug, 'my-new-page');

  const metrics = await (await req('PATCH', `/api/admin/projects/${a.id}`, { cookie, body: { metrics: '40% | faster\n3x' } })).json();
  assert.deepEqual(metrics.metrics, [{ value: '40%', label: 'faster' }, { value: '3x', label: '' }]);

  await req('DELETE', `/api/admin/projects/${a.id}`, { cookie });
});

test('site settings drive the home page', async () => {
  const cookie = await login();
  const site = await (await req('GET', '/api/admin/site', { cookie })).json();
  assert.equal(site.stats.length, 4);

  const bad = await req('PUT', '/api/admin/site', { cookie, body: { ...site, email: 'nope', stats: site.stats.slice(0, 2) } });
  assert.equal(bad.status, 400);
  const { fields } = await bad.json();
  assert.ok(fields.email && fields.stats);

  const badStat = await req('PUT', '/api/admin/site', { cookie, body: { ...site, stats: site.stats.map((s, i) => (i === 1 ? { ...s, value: '' } : s)) } });
  assert.ok((await badStat.json()).fields['stats.1.value']);

  const saved = await (await req('PUT', '/api/admin/site', {
    cookie,
    body: { ...site, available: false, availability: 'Booked until June', email: 'studio@tanvi.example', linkedin: 'https://linkedin.com/in/tanvi', stats: site.stats.map((s, i) => (i === 0 ? { ...s, value: '5+' } : s)) },
  })).json();
  assert.equal(saved.email, 'studio@tanvi.example');

  const page = await (await req('GET', '/')).text();
  assert.match(page, /status-pill reveal off/);
  assert.match(page, /Booked until June/);
  assert.match(page, /mailto:studio@tanvi.example/);
  assert.match(page, /href="https:\/\/linkedin.com\/in\/tanvi"/);
  assert.match(page, /5<sup>\+<\/sup>/);
  assert.equal((await (await req('GET', '/api/site')).json()).availability, 'Booked until June');

  const js = await req('PUT', '/api/admin/site', { cookie, body: { ...site, dribbble: 'javascript:alert(1)' } });
  assert.equal(js.status, 400);

  assert.equal((await req('PUT', '/api/admin/site', { body: site })).status, 401);
});

test('a database from the previous version upgrades in place', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-')), 'old.db');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]', url TEXT NOT NULL DEFAULT '', theme TEXT NOT NULL DEFAULT 's1', layout TEXT NOT NULL DEFAULT 'phone',
    sort_order INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`);
  old.exec("INSERT INTO projects (title) VALUES ('My Project'), ('My Project')");
  old.close();

  const upgraded = openDatabase(file);
  const rows = upgraded.prepare('SELECT slug, summary, metrics FROM projects ORDER BY id').all();
  assert.deepEqual(rows.map((r) => r.slug), ['my-project', 'my-project-2']);
  assert.equal(rows[0].summary, '');
  assert.equal(rows[0].metrics, '[]');
  upgraded.close();
});
