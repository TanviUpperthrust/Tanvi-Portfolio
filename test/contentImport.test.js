import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { contentTypes } from '../src/content.js';
import { validate, ValidationError } from '../src/validate.js';

let db, server, base, cookie;

before(async () => {
  db = openDatabase(':memory:');
  server = createApp({
    db,
    mailer: { enabled: false, notifyNewMessage: async () => false },
    config: { adminPassword: 'import-test', sessionSecret: 'import-secret', trustProxy: false },
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const response = await request('POST', '/api/admin/login', { password: 'import-test' });
  cookie = response.headers.get('set-cookie').split(';')[0];
});

after(() => {
  server.close();
  db.close();
});

function request(method, route, body) {
  return fetch(base + route, {
    method,
    headers: { ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
}

test('existing databases gain media fields without changing edited project content', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-import-'));
  const file = path.join(directory, 'existing.db');
  let connection;
  try {
    connection = new DatabaseSync(file);
    connection.exec(`CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT,
      category TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
      url TEXT NOT NULL DEFAULT '', theme TEXT NOT NULL DEFAULT 's1', layout TEXT NOT NULL DEFAULT 'phone',
      summary TEXT NOT NULL DEFAULT '', challenge TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
    );
    INSERT INTO projects (id, title, slug, summary, challenge, sort_order, published)
    VALUES (42, 'An edited project', 'an-edited-project', 'Keep this summary', 'Keep this story', 7, 0);`);
    connection.close();
    connection = openDatabase(file);
    let project = connection.prepare('SELECT * FROM projects WHERE id = 42').get();
    assert.equal(project.title, 'An edited project');
    assert.equal(project.summary, 'Keep this summary');
    assert.equal(project.challenge, 'Keep this story');
    assert.equal(project.sort_order, 7);
    assert.equal(project.published, 0);
    assert.equal(project.cover_image, '');
    assert.equal(project.sections, '[]');
    assert.equal(project.year, '');
    assert.equal(project.prototype_url, '');
    connection.prepare('UPDATE projects SET cover_image = ?, sections = ?, year = ? WHERE id = 42')
      .run('/assets/images/portfolio/cover.png', '[{"heading":"Imported chapter","body":"Original text","images":[]}]', '2025');
    connection.close();
    connection = openDatabase(file);
    project = connection.prepare('SELECT * FROM projects WHERE id = 42').get();
    assert.equal(project.cover_image, '/assets/images/portfolio/cover.png');
    assert.equal(JSON.parse(project.sections)[0].body, 'Original text');
    assert.equal(project.year, '2025');
  } finally {
    connection?.close();
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
    fs.rmdirSync(directory);
  }
});

test('project APIs round-trip ordered imported sections and metadata-only edits preserve them', async () => {
  const sections = [
    {
      heading: 'Understanding the problem',
      body: 'An original paragraph.\n\nA second paragraph with *emphasis*.\n\n- The first observation\n- The next observation',
      images: [
        { src: '/assets/images/portfolio/journey.png', alt: 'The original journey', caption: 'First, map the experience.' },
        { src: '/assets/images/portfolio/wireframe%20draft.png', alt: 'An early wireframe' },
      ],
    },
    {
      heading: '',
      body: 'Long-form case study detail. '.repeat(500),
      images: [{ src: 'https://framerusercontent.com/images/example.png', alt: 'A detailed screen' }],
    },
    { heading: 'Original literal text', body: '<script>alert("text only")</script>\n\nKeep <b>the original wording</b>.', images: [] },
  ];
  const createdResponse = await request('POST', '/api/admin/projects', {
    title: 'Imported portfolio story', coverImage: '/assets/images/portfolio/cover.png', year: '2024–2025', sections,
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.coverImage, '/assets/images/portfolio/cover.png');
  assert.equal(created.cover_image, undefined, 'the database column is exposed with the camelCase API name');
  assert.equal(created.year, '2024–2025');
  assert.deepEqual(created.sections, sections, 'paragraph and image order survive storage without flattening or truncation');

  const changedResponse = await request('PATCH', `/api/admin/projects/${created.id}`, { summary: 'An updated CMS summary' });
  assert.equal(changedResponse.status, 200);
  const changed = await changedResponse.json();
  assert.equal(changed.summary, 'An updated CMS summary');
  assert.equal(changed.coverImage, created.coverImage);
  assert.equal(changed.year, created.year);
  assert.deepEqual(changed.sections, sections);

  const publicProject = await (await request('GET', `/api/projects/${created.slug}`)).json();
  assert.deepEqual(publicProject.sections, sections);
  assert.equal(publicProject.coverImage, created.coverImage);
  const cards = await (await request('GET', '/api/projects')).json();
  const card = cards.find((project) => project.id === created.id);
  assert.equal(card.coverImage, created.coverImage);
  assert.equal(card.year, created.year);
  assert.equal(card.sections, undefined, 'card lists do not carry the complete case study');

  const cleared = await (await request('PATCH', `/api/admin/projects/${created.id}`, { sections: [], coverImage: '', year: '' })).json();
  assert.deepEqual(cleared.sections, []);
  assert.equal(cleared.coverImage, '');
  assert.equal(cleared.year, '');
});

test('published case studies render every imported section and image in order with escaped text', async () => {
  const imagePaths = [
    '/assets/images/portfolio/first-detail.png',
    '/assets/images/portfolio/second-detail.png',
    '/assets/images/portfolio/image-only.png?version=1&size=large',
  ];
  const input = {
    title: 'Imported rendering proof',
    coverImage: '/assets/images/portfolio/render-cover.png?version=1&size=wide',
    url: 'https://www.behance.net/gallery/12345/complete-story',
    prototypeUrl: 'https://www.figma.com/proto/example?node=1&mode=preview',
    challenge: 'LEGACY COPY SHOULD NOT BE DUPLICATED',
    sections: [
      {
        heading: 'Context <script>alert("heading")</script>',
        body: 'First original paragraph.\n\nSecond paragraph with *intentional emphasis*.\n\n<img src=x onerror=alert(1)>',
        images: [
          { src: imagePaths[0], alt: '" onerror="alert(1)" <image>', caption: 'Original caption <img src=x onerror=alert(1)> & notes' },
          { src: imagePaths[1], alt: 'The second screen' },
        ],
      },
      { heading: '', body: '', images: [{ src: imagePaths[2], alt: '' }] },
      { heading: 'Final chapter', body: 'The final original paragraph.', images: [] },
    ],
  };
  const createdResponse = await request('POST', '/api/admin/projects', input);
  assert.equal(createdResponse.status, 201);
  const project = await createdResponse.json();
  const response = await request('GET', `/work/${project.slug}`);
  assert.equal(response.status, 200);
  const page = await response.text();
  const main = page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
  assert.equal((main.match(/class="project-content-section"/g) || []).length, 2, 'text chapters remain present while images are woven between them');
  assert.match(main, /Context &lt;script&gt;alert\(&quot;heading&quot;\)&lt;\/script&gt;/);
  assert.match(main, /<em>intentional emphasis<\/em>/);
  assert.match(main, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(main, /alt="&quot; onerror=&quot;alert\(1\)&quot; &lt;image&gt;"/);
  assert.match(main, /<figcaption>Original caption &lt;img src=x onerror=alert\(1\)&gt; &amp; notes<\/figcaption>/);
  assert.doesNotMatch(main, /<script\b|<img\s+src=x| onerror="| onerror='/i);
  assert.doesNotMatch(main, /LEGACY COPY SHOULD NOT BE DUPLICATED/, 'structured chapters replace legacy story buckets rather than repeat them');
  assert.match(main, /href="https:\/\/www\.behance\.net\/gallery\/12345\/complete-story"/);
  assert.match(main, /href="https:\/\/www\.figma\.com\/proto\/example\?node=1&amp;mode=preview"/);

  const order = [
    '<img src="/assets/images/portfolio/render-cover.png?version=1&amp;size=wide"',
    'Context &lt;script&gt;',
    'First original paragraph.',
    'Second paragraph with',
    '<img src="' + imagePaths[0] + '"',
    '<img src="' + imagePaths[1] + '"',
    '<img src="/assets/images/portfolio/image-only.png?version=1&amp;size=large"',
    'Final chapter',
    'The final original paragraph.',
  ].map((token) => {
    const index = main.indexOf(token);
    assert.ok(index >= 0, token);
    return index;
  });
  assert.ok(order.every((position, index) => index === 0 || position > order[index - 1]), 'cover, paragraphs, image sequence and later chapters follow the imported order');
  for (const src of imagePaths) {
    const escaped = src.replaceAll('&', '&amp;');
    assert.ok(main.includes(`href="${escaped}" target="_blank" rel="noopener"`), 'each original image opens at full size');
  }
});

test('unsafe cover and section image paths are rejected before any project is written', async () => {
  const beforeCount = db.prepare('SELECT COUNT(*) AS count FROM projects').get().count;
  const unsafe = [
    'javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', '//example.com/image.png',
    '/admin', '/assets/../admin', '/assets/%2e%2e/admin', '/assets/%252e%252e/admin',
    '/assets/images\\..\\admin', '/assets/images/%5c..%5cadmin', '/assets/images/%00image.png',
    'https://example.com/image.png" onerror="alert(1)',
  ];
  for (const src of unsafe) {
    const cover = await request('POST', '/api/admin/projects', { title: 'Invalid imported cover', coverImage: src });
    assert.equal(cover.status, 400, src);
    assert.ok((await cover.json()).fields.coverImage, src);
    const section = await request('POST', '/api/admin/projects', { title: 'Invalid imported section', sections: [{ images: [{ src }] }] });
    assert.equal(section.status, 400, src);
    assert.ok((await section.json()).fields.sections, src);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM projects').get().count, beforeCount);
});

test('case-study and prototype links are stored independently and survive metadata edits', async () => {
  const input = {
    title: 'A project with a prototype',
    url: 'https://www.behance.net/gallery/12345/case-study',
    prototypeUrl: 'https://www.figma.com/proto/example/interactive-design',
  };
  const response = await request('POST', '/api/admin/projects', input);
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.url, input.url);
  assert.equal(created.prototypeUrl, input.prototypeUrl);
  assert.equal(created.prototype_url, undefined);
  const updated = await (await request('PATCH', `/api/admin/projects/${created.id}`, { summary: 'Revised in the CMS' })).json();
  assert.equal(updated.url, input.url);
  assert.equal(updated.prototypeUrl, input.prototypeUrl);
  const publicProject = await (await request('GET', `/api/projects/${created.slug}`)).json();
  assert.equal(publicProject.prototypeUrl, input.prototypeUrl);
  const list = await (await request('GET', '/api/projects')).json();
  assert.equal(list.find((project) => project.id === created.id).prototypeUrl, input.prototypeUrl);
  const invalid = await request('PATCH', `/api/admin/projects/${created.id}`, { prototypeUrl: 'javascript:alert(1)' });
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).fields.prototypeUrl);
  const cleared = await (await request('PATCH', `/api/admin/projects/${created.id}`, { prototypeUrl: '' })).json();
  assert.equal(cleared.prototypeUrl, '');
  assert.equal(cleared.url, input.url);
});

test('section limits reject excessive or invalid data without silently shortening it', () => {
  const schema = contentTypes.projects.schema;
  const valid = validate({ sections: [{ body: 'x'.repeat(50000), images: Array.from({ length: 100 }, () => ({ src: '/assets/images/portfolio/a.png', alt: 'a'.repeat(500) })) }] }, schema, { partial: true });
  assert.equal(valid.sections[0].body.length, 50000);
  assert.equal(valid.sections[0].images.length, 100);
  for (const sections of [
    Array.from({ length: 101 }, () => ({})),
    [{ body: 'x'.repeat(50001) }],
    [{ images: Array.from({ length: 101 }, () => ({ src: '/assets/a.png' })) }],
    [{ images: [{ src: '/assets/a.png', alt: 'x'.repeat(501) }] }],
    [{ body: { html: '<p>not a text field</p>' } }],
    [null],
  ]) {
    assert.throws(() => validate({ sections }, schema, { partial: true }), (error) => error instanceof ValidationError && Boolean(error.fields.sections));
  }
  assert.deepEqual(validate({ sections: [{ images: [{ src: '/assets/a.png', onclick: 'ignored' }] }] }, schema, { partial: true }).sections,
    [{ heading: '', body: '', images: [{ src: '/assets/a.png', alt: '' }] }], 'only supported structured data is retained');
});

test('row conversion tolerates malformed legacy JSON and keeps omitted import fields out of updates', () => {
  const { fromRow, toRow } = contentTypes.projects;
  const project = fromRow({ title: 'Legacy record', cover_image: '/assets/a.png', tags: '{bad', metrics: 'null', sections: '{bad', year: '2025' });
  assert.equal(project.coverImage, '/assets/a.png');
  assert.equal(project.cover_image, undefined);
  assert.deepEqual(project.tags, []);
  assert.deepEqual(project.metrics, []);
  assert.deepEqual(project.sections, []);
  assert.deepEqual(toRow({ summary: 'Only this field changes' }), { summary: 'Only this field changes' });
  const clear = toRow({ coverImage: '', sections: [], year: '' });
  assert.deepEqual(clear, { cover_image: '', sections: '[]', year: '' });
});
