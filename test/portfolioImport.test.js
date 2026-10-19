import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase } from '../src/db.js';
import { importPortfolio } from '../src/importPortfolio.js';
import { createSiteStore } from '../src/site.js';
import { contentTypes } from '../src/content.js';
import { SEED_PROJECTS } from '../src/seed.js';

const IMPORT_KEY = 'framer-portfolio-import-v1';
const TITLES = [
  'Noise Pollution in Festivals & Events', 'Panchkalyanak Management System',
  'Smart Kitchen Management System', 'StreamBot Movie Recommendation Chatbot', 'Two Factor Authentication',
];

function fixture(t) {
  const db = openDatabase(':memory:');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tanvi-portfolio-import-test-'));
  const publicDir = path.join(directory, 'public');
  fs.mkdirSync(path.join(publicDir, 'assets', 'images'), { recursive: true });
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhZkAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(path.join(publicDir, 'assets', 'images', 'cover.png'), pixel);
  fs.writeFileSync(path.join(publicDir, 'assets', 'images', 'detail.png'), pixel);
  t.after(() => {
    db.close();
    // Remove only this test's newly-created temporary directory.
    assert.equal(path.resolve(path.dirname(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('tanvi-portfolio-import-test-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const manifest = {
    sourceUrl: 'https://tanvijainportfolio.framer.website/',
    profile: {
      email: 'tanvi@example.com', location: 'India',
      instagram: 'https://www.instagram.com/tanvi/', behance: 'https://www.behance.net/tanvi',
    },
    projects: TITLES.map((title, index) => ({
      title, slug: `imported-case-${index + 1}`, category: 'UX Design', tags: ['Research', 'UI'],
      summary: `Published case-study overview ${index + 1}.`, duration: '5 weeks',
      coverImage: '/assets/images/cover.png', layout: 'wide', theme: 's1',
      sort_order: index, published: true,
      sections: [{ heading: 'Project overview', body: `Original project details ${index + 1}.`, images: [
        { src: '/assets/images/detail.png', alt: `Case ${index + 1} research`, caption: 'Published source material.' },
      ] }],
    })),
  };
  return { db, publicDir, manifest, site: createSiteStore(db) };
}

function snapshot(db) {
  return {
    projects: db.prepare('SELECT * FROM projects ORDER BY id').all(),
    settings: db.prepare('SELECT * FROM settings ORDER BY key').all(),
  };
}

test('one-time import persists all five real case studies, archives untouched examples and turns off templates', t => {
  const { db, publicDir, manifest, site } = fixture(t);
  const originalSite = site.get();
  const result = importPortfolio(db, manifest, publicDir);
  assert.equal(result.alreadyImported, false);
  assert.equal(result.inserted, 5);
  assert.equal(result.archivedSamples, SEED_PROJECTS.length);
  const published = db.prepare('SELECT * FROM projects WHERE published = 1 ORDER BY sort_order').all();
  assert.equal(published.length, 5);
  assert.deepEqual(published.map(row => row.title), TITLES);
  const first = contentTypes.projects.fromRow(published[0]);
  assert.deepEqual(first.sections, manifest.projects[0].sections, 'case text, image order, alt text and captions survive storage');
  assert.equal(first.coverImage, manifest.projects[0].coverImage);
  assert.deepEqual(first.tags, ['Research', 'UI']);
  assert.equal(site.get().showProjectTemplates, false);
  assert.equal(site.get().email, manifest.profile.email);
  assert.equal(site.get().location, manifest.profile.location);
  assert.deepEqual(site.get().stats, originalSite.stats, 'unrelated profile settings survive');
  const marker = JSON.parse(db.prepare('SELECT value FROM settings WHERE key = ?').get(IMPORT_KEY).value);
  assert.deepEqual(marker.slugs, manifest.projects.map(project => project.slug));
  assert.ok(Number.isFinite(Date.parse(marker.importedAt)));
});

test('repeat import preserves subsequent admin edits and does not import a changed manifest twice', t => {
  const { db, publicDir, manifest, site } = fixture(t);
  importPortfolio(db, manifest, publicDir);
  db.prepare('UPDATE projects SET title = ?, summary = ?, published = 0 WHERE slug = ?')
    .run('Edited by Tanvi in admin', 'Updated case study copy.', manifest.projects[0].slug);
  site.save({ ...site.get(), email: 'admin-edit@example.com', location: 'Updated location' });
  const before = snapshot(db);
  manifest.projects[0].title = 'Stale source title';
  manifest.projects.push({ ...manifest.projects[1], slug: 'should-not-be-added' });
  assert.deepEqual(importPortfolio(db, manifest, publicDir), { alreadyImported: true, inserted: 0 });
  assert.deepEqual(snapshot(db), before);
});

test('import preserves custom published content and existing projects with an imported slug', t => {
  const { db, publicDir, manifest } = fixture(t);
  const insert = db.prepare('INSERT INTO projects (title, slug, summary, published) VALUES (?, ?, ?, 1)');
  insert.run('Existing real client project', 'custom-project', 'Keep this custom content.');
  insert.run('Existing edited imported case', manifest.projects[0].slug, 'An earlier admin version.');
  const customBefore = db.prepare('SELECT * FROM projects WHERE slug = ?').get('custom-project');
  const existingBefore = db.prepare('SELECT * FROM projects WHERE slug = ?').get(manifest.projects[0].slug);
  const result = importPortfolio(db, manifest, publicDir);
  assert.equal(result.inserted, 4);
  assert.deepEqual(db.prepare('SELECT * FROM projects WHERE slug = ?').get('custom-project'), customBefore);
  assert.deepEqual(db.prepare('SELECT * FROM projects WHERE slug = ?').get(manifest.projects[0].slug), existingBefore);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM projects WHERE published = 1').get().count, 6);
});

test('only untouched seed samples are hidden, including when admin edits change other fields', t => {
  const { db, publicDir, manifest } = fixture(t);
  db.prepare('UPDATE projects SET duration = ? WHERE slug = ?').run('Edited project duration', SEED_PROJECTS[0].slug);
  db.prepare('UPDATE projects SET category = ? WHERE slug = ?').run('My real research work', SEED_PROJECTS[1].slug);
  const result = importPortfolio(db, manifest, publicDir);
  assert.equal(db.prepare('SELECT published FROM projects WHERE slug = ?').get(SEED_PROJECTS[0].slug).published, 1, 'a duration edit must prevent archival');
  assert.equal(db.prepare('SELECT published FROM projects WHERE slug = ?').get(SEED_PROJECTS[1].slug).published, 1, 'a category edit must prevent archival');
  assert.equal(result.archivedSamples, SEED_PROJECTS.length - 2);
});

test('invalid and missing image assets fail without partial project or settings writes', async t => {
  for (const [name, mutate] of [
    ['missing cover', project => { project.coverImage = '/assets/images/missing.png'; }],
    ['missing section image', project => { project.sections[0].images[0].src = '/assets/images/missing-detail.png'; }],
    ['unsafe path', project => { project.coverImage = '/assets/../outside.png'; }],
    ['directory instead of image file', project => { project.coverImage = '/assets/images/'; }],
  ]) {
    await t.test(name, subtest => {
      const { db, publicDir, manifest } = fixture(subtest);
      const before = snapshot(db);
      mutate(manifest.projects.at(-1));
      assert.throws(() => importPortfolio(db, manifest, publicDir), 'an invalid final project must abort the entire import');
      assert.deepEqual(snapshot(db), before);
    });
  }
});

test('an invalid profile rolls back inserted projects, sample archival and the import marker', t => {
  const { db, publicDir, manifest, site } = fixture(t);
  site.save({ ...site.get(), location: 'Existing profile' });
  const before = snapshot(db);
  manifest.profile.email = 'not-an-email';
  assert.throws(() => importPortfolio(db, manifest, publicDir), error => !!error.fields?.email);
  assert.deepEqual(snapshot(db), before, 'the transaction must also undo seed archival');
  assert.equal(db.prepare('SELECT value FROM settings WHERE key = ?').get(IMPORT_KEY), undefined);
  manifest.profile.email = 'valid@example.com';
  assert.equal(importPortfolio(db, manifest, publicDir).inserted, 5, 'a failed transaction can be retried successfully');
});
