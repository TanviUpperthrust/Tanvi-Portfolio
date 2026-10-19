import fs from 'node:fs';
import path from 'node:path';
import { contentTypes } from './content.js';
import { validate } from './validate.js';
import { createSiteStore } from './site.js';
import { SEED_PROJECTS } from './seed.js';

const IMPORT_KEY = 'framer-portfolio-import-v1';

// An explicit one-time import. Later admin edits are never overwritten on startup.
export function importPortfolio(db, manifest, publicDir) {
  if (db.prepare('SELECT value FROM settings WHERE key = ?').get(IMPORT_KEY)) return { alreadyImported: true, inserted: 0 };
  if (!Array.isArray(manifest.projects) || !manifest.projects.length) throw new Error('The portfolio import contains no projects.');
  const type = contentTypes.projects;
  const projects = manifest.projects.map((project) => validate(project, type.schema));
  for (const project of projects) {
    for (const src of [project.coverImage, ...project.sections.flatMap((section) => section.images.map((image) => image.src))].filter(Boolean)) {
      const target = path.resolve(publicDir, src.replace(/^\//, ''));
      if (!src.startsWith('/assets/') || !target.startsWith(path.resolve(publicDir) + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        throw new Error(`A portfolio image is missing: ${src}`);
      }
    }
  }
  const siteStore = createSiteStore(db);
  let inserted = 0, archivedSamples = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const project of projects) {
      if (db.prepare('SELECT id FROM projects WHERE slug = ?').get(project.slug)) continue;
      const row = type.toRow(project);
      const columns = type.columns.filter((column) => row[column] !== undefined);
      db.prepare(`INSERT INTO projects (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...columns.map((column) => row[column]));
      inserted++;
    }
    // Hide only untouched fictional starter projects; retain custom/admin content.
    for (const [index, sample] of SEED_PROJECTS.entries()) {
      const row = db.prepare('SELECT * FROM projects WHERE slug = ?').get(sample.slug);
      const unchanged = row && Object.entries(sample).every(([key, value]) => {
        const actual = Array.isArray(value) ? JSON.parse(row[key]) : row[key];
        return JSON.stringify(actual) === JSON.stringify(value);
      }) && row.sort_order === index && row.url === (sample.url || '') && !row.cover_image && !row.prototype_url && !row.year && JSON.parse(row.sections).length === 0;
      if (unchanged) {
        db.prepare('UPDATE projects SET published = 0 WHERE id = ?').run(row.id);
        archivedSamples++;
      }
    }
    const current = siteStore.get();
    siteStore.save({ ...current, showProjectTemplates: false, email: manifest.profile.email, location: manifest.profile.location, instagram: manifest.profile.instagram, behance: manifest.profile.behance });
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(IMPORT_KEY, JSON.stringify({ sourceUrl: manifest.sourceUrl, importedAt: new Date().toISOString(), slugs: projects.map((project) => project.slug) }));
    db.exec('COMMIT');
    return { alreadyImported: false, inserted, archivedSamples };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
