import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { STUDIO_SERVICES } from '../src/studioServices.js';

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

test('home page renders the personal introduction, five templates and links to the public pages', async () => {
  const res = await req('GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const page = await res.text();
  assert.equal((page.match(/data-project-template="true"/g) || []).length, 5, 'five project templates are shown while content is being prepared');
  assert.doesNotMatch(page, /href="\/work\/paisa-budgeting-app"/, 'templates do not link to sample project stories');
  assert.match(page, /class="[^"]*\bhome-hero\b/);
  const site = await (await req('GET', '/api/site')).json();
  assert.ok(page.includes(site.availability), 'availability remains server-rendered from site settings');
  for (const route of ['/work', '/about', '/services', '/contact']) {
    assert.ok(page.includes(`href="${route}"`), route);
  }
  for (let index = 1; index <= 5; index++) {
    assert.ok(page.includes(`href="/work/project-${String(index).padStart(2, '0')}"`));
  }
  assert.doesNotMatch(page, /id="contactForm"|id="quotesData"/, 'contact and editorial content have their own pages');
  assert.match(page, /<link rel="canonical" href="https:\/\/tanvi.example\/"/);
  assert.doesNotMatch(page, /<script>/, 'no inline scripts');
});

test('CSP forbids inline scripts', async () => {
  for (const route of ['/', '/about', '/work', '/services', '/contact']) {
    const response = await req('GET', route);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'(;|$)/, route);
    const page = await response.text();
    for (const script of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.ok(/\bsrc=/.test(script[1]) || /\btype="application\/(?:ld\+)?json"/.test(script[1]), `${route}: executable scripts must be external`);
    }
  }
});

test('every public page includes a light default, an early saved-theme initializer and the accessible theme control', async () => {
  const routes = ['/', '/work', '/about', '/services', '/contact', '/work/project-01', '/not-a-page', ...STUDIO_SERVICES.map(service => `/services/${service.slug}`)];
  for (const route of routes) {
    const page = await (await req('GET', route)).text();
    assert.match(page, /<html lang="en" data-theme="light">/, route);
    assert.match(page, /name="theme-color" content="#f5f3ed"/, route);
    assert.match(page, /id="themeToggle"[^>]*type="button"[^>]*aria-label="Switch to dark mode"[^>]*aria-pressed="false"/, route);
    assert.match(page, /data-theme-icon="light"/, route);
    assert.match(page, /data-theme-icon="dark"/, route);
    const initializer = page.match(/<script\b[^>]*src="\/assets\/js\/appearance\.js[^>]*>/)?.[0];
    assert.ok(initializer, `${route}: saved-theme initializer is present`);
    assert.doesNotMatch(initializer, /\b(?:async|defer)\b/, 'saved theme must apply before styles render');
    assert.ok(page.indexOf(initializer) < page.indexOf('<link rel="stylesheet"'), `${route}: theme restores before CSS`);
    assert.ok(page.indexOf('/assets/css/appearance.css') > page.indexOf('/assets/css/project-content.css'), `${route}: theme covers every public stylesheet`);
  }
});

test('the public routes render complete, distinct pages and the contact form retains its API fields', async () => {
  const expectations = new Map([
    ['/about', /class="about-intro page-wrap"/],
    ['/work', /data-work-view="grid"/],
    ['/services', /class="services-offerings simple-services page-wrap"/],
    ['/contact', /id="contactForm"/],
  ]);
  for (const [route, expected] of expectations) {
    const response = await req('GET', route);
    assert.equal(response.status, 200, route);
    const page = await response.text();
    assert.match(page, expected, route);
    assert.ok(page.includes(`href="https://tanvi.example${route}"`), `${route}: canonical URL`);
  }
  const about = await (await req('GET', '/about')).text();
  assert.match(about, /Toolkit/);
  assert.match(about, /portrait of Tanvi/);
  const archive = await (await req('GET', '/work')).text();
  assert.match(archive, /data-view-panel="list"/);
  assert.match(archive, /data-view-panel="grid" hidden/);
  const contact = await (await req('GET', '/contact')).text();
  for (const name of ['name', 'email', 'topic', 'budget', 'message', 'website']) {
    assert.ok(contact.includes(`name="${name}"`), name);
  }
  assert.match(contact, /id="formStatus"[^>]*role="status"/);
  assert.match(contact, /assets\/js\/contact\.js/);
});

test('all seven services and project template pages are reachable without invented project results', async () => {
  assert.equal(STUDIO_SERVICES.length, 7);
  const services = await (await req('GET', '/services')).text();
  for (const service of STUDIO_SERVICES) {
    assert.ok(services.includes(`href="/services/${service.slug}"`));
    const response = await req('GET', `/services/${service.slug}`);
    assert.equal(response.status, 200, service.slug);
    const page = await response.text();
    assert.ok(page.includes(service.title.replaceAll('&', '&amp;')));
    assert.match(page, /<details\b/);
    assert.match(page, /href="\/contact"/);
  }
  for (let index = 1; index <= 5; index++) {
    const number = String(index).padStart(2, '0');
    const response = await req('GET', `/work/project-${number}`);
    assert.equal(response.status, 200, number);
    const page = await response.text();
    assert.match(page, new RegExp(`Project ${number}`));
    const main = page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
    assert.match(main, /template|coming soon|in preparation/i, 'unfinished work is clearly identified');
    assert.doesNotMatch(main, /52%|fewer drop-offs|trial-to-paid conversion|App Store rating/, 'templates contain no sample performance claims');
  }
  assert.equal((await req('GET', '/services/not-a-service')).status, 404);
});

test('case study page renders every section', async () => {
  const res = await req('GET', '/work/carelink-dashboard');
  assert.equal(res.status, 200);
  const page = await res.text();
  assert.match(page, /<title>CareLink Dashboard[^<]*Tanvi<\/title>/);
  assert.match(page, /challenge/i);
  assert.match(page, /approach/i);
  assert.match(page, /<ul><li>/, 'bullet lines become a list');
  assert.match(page, /clicks to reach patient vitals/);
  assert.match(page, /Next (?:case study|project)/i);
  assert.match(page, /href="\/work\/chai-and-co-ordering"/, 'links to the next project');
  assert.match(page, /og:type" content="article"/);
});

test('unknown pages and hidden projects get the styled 404', async () => {
  const res = await req('GET', '/work/does-not-exist');
  assert.equal(res.status, 404);
  const page = await res.text();
  assert.match(page, /404|not found|wrong turn/i);
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
  for (const route of ['/about', '/work', '/services', '/contact', '/work/project-01', '/work/project-05', ...STUDIO_SERVICES.map((service) => `/services/${service.slug}`)]) {
    assert.ok(xml.includes(`<loc>https://tanvi.example${route}</loc>`), route);
  }

  const robots = await (await req('GET', '/robots.txt')).text();
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Sitemap: https:\/\/tanvi.example\/sitemap.xml/);

  for (const p of ['/assets/css/studio.css', '/assets/css/appearance.css', '/assets/js/appearance.js', '/assets/js/studio.js', '/assets/js/contact.js', '/assets/js/admin.js', '/favicon.svg']) {
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

test('site settings control published work, availability and contact details across the site', async () => {
  const cookie = await login();
  const site = await (await req('GET', '/api/admin/site', { cookie })).json();
  assert.equal(site.stats.length, 4);
  assert.equal(site.showProjectTemplates, true);

  await req('PUT', '/api/admin/site', { cookie, body: { ...site, showProjectTemplates: false } });
  const published = await (await req('GET', '/')).text();
  assert.match(published, /href="\/work\/paisa-budgeting-app"/, 'turning off templates restores published CMS projects');
  assert.doesNotMatch(published, /data-project-template=/);
  const archive = await (await req('GET', '/work')).text();
  assert.match(archive, /href="\/work\/paisa-budgeting-app"/);
  assert.doesNotMatch(archive, /href="\/work\/project-01"/);
  await req('PUT', '/api/admin/site', { cookie, body: site });

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
  assert.match(page, /class="[^"]*hero-availability[^"]*is-unavailable/);
  assert.match(page, /Booked until June/);
  assert.match(page, /mailto:studio@tanvi.example/);
  assert.match(page, /href="https:\/\/linkedin.com\/in\/tanvi"/);
  const contact = await (await req('GET', '/contact')).text();
  assert.match(contact, /data-email="studio@tanvi.example"/);
  assert.match(contact, /mailto:studio@tanvi.example/);
  assert.equal(saved.stats[0].value, '5+', 'existing editable site statistics remain compatible');
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

