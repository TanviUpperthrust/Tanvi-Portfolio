import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SEED_PROJECTS, SEED_TESTIMONIALS } from './seed.js';
import { slugify } from './content.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  topic       TEXT,
  budget      TEXT,
  message     TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  emailed     INTEGER NOT NULL DEFAULT 0,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS messages_created ON messages (created_at DESC);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  url         TEXT NOT NULL DEFAULT '',
  theme       TEXT NOT NULL DEFAULT 's1',
  layout      TEXT NOT NULL DEFAULT 'phone',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quote       TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

// Columns added after the first release. Added with ALTER TABLE so databases
// created by an earlier version upgrade in place.
const PROJECT_COLUMNS = [
  ['slug', 'TEXT'],
  ['summary', "TEXT NOT NULL DEFAULT ''"],
  ['client', "TEXT NOT NULL DEFAULT ''"],
  ['role', "TEXT NOT NULL DEFAULT ''"],
  ['duration', "TEXT NOT NULL DEFAULT ''"],
  ['challenge', "TEXT NOT NULL DEFAULT ''"],
  ['approach', "TEXT NOT NULL DEFAULT ''"],
  ['outcome', "TEXT NOT NULL DEFAULT ''"],
  ['metrics', "TEXT NOT NULL DEFAULT '[]'"],
  ['cover_image', "TEXT NOT NULL DEFAULT ''"],
  ['sections', "TEXT NOT NULL DEFAULT '[]'"],
  ['year', "TEXT NOT NULL DEFAULT ''"],
  ['prototype_url', "TEXT NOT NULL DEFAULT ''"],
];

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}

function migrate(db) {
  const existing = new Set(db.prepare('PRAGMA table_info(projects)').all().map((c) => c.name));
  for (const [name, def] of PROJECT_COLUMNS) {
    if (!existing.has(name)) db.exec(`ALTER TABLE projects ADD COLUMN ${name} ${def}`);
  }

  // Give any project without a slug one derived from its title.
  const missing = db.prepare("SELECT id, title FROM projects WHERE slug IS NULL OR slug = ''").all();
  const taken = new Set(db.prepare("SELECT slug FROM projects WHERE slug IS NOT NULL AND slug <> ''").all().map((r) => r.slug));
  const setSlug = db.prepare('UPDATE projects SET slug = ? WHERE id = ?');
  for (const { id, title } of missing) {
    const base = slugify(title) || `project-${id}`;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    setSlug.run(slug, id);
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS projects_slug ON projects (slug)');
}

function seed(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM projects').get().n === 0) {
    const cols = ['title', 'slug', 'category', 'tags', 'theme', 'layout', 'summary', 'client', 'role', 'duration', 'challenge', 'approach', 'outcome', 'metrics', 'sort_order'];
    const insert = db.prepare(`INSERT INTO projects (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`);
    SEED_PROJECTS.forEach((p, i) => {
      const row = { ...p, tags: JSON.stringify(p.tags), metrics: JSON.stringify(p.metrics), sort_order: i };
      insert.run(...cols.map((c) => row[c]));
    });
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM testimonials').get().n === 0) {
    const insert = db.prepare('INSERT INTO testimonials (quote, name, role, sort_order) VALUES (?, ?, ?, ?)');
    SEED_TESTIMONIALS.forEach((t, i) => insert.run(t.quote, t.name, t.role, i));
  }
}
