import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

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
`;

// Matches the content that was hard-coded in index.html before the backend existed.
const SEED_PROJECTS = [
  { title: 'Paisa: Budgeting App', category: 'Mobile · Fintech · 2025', tags: ['Research', 'UI'], theme: 's1', layout: 'phone' },
  { title: 'CareLink Dashboard', category: 'Web · Healthcare · 2025', tags: ['IA', 'Design system'], theme: 's2', layout: 'wide' },
  { title: 'Chai & Co. Ordering', category: 'Mobile · F&B · 2024', tags: ['Prototyping', 'UI'], theme: 's3', layout: 'phone-profile' },
  { title: 'Orbit: SaaS Analytics', category: 'Web · B2B SaaS · 2024', tags: ['UX audit', 'Redesign'], theme: 's4', layout: 'wide-sidebar' },
];

// *word* renders as italic serif emphasis on the site.
const SEED_TESTIMONIALS = [
  { quote: "Tanvi didn't just redesign our app, she *rethought* how our users manage money. Onboarding drop-off fell by half within a month.", name: 'Aarav Mehta', role: 'Founder, Paisa' },
  { quote: "Her research uncovered problems we'd been blind to for years. The new dashboard feels *calm*, and our clinicians actually enjoy using it.", name: 'Dr. Neha Kapoor', role: 'Product Lead, CareLink' },
  { quote: 'The design system she built is the reason we ship twice as fast. Clear docs, thoughtful tokens and a *joy* to work with.', name: 'Rohan Iyer', role: 'Engineering Manager, Orbit' },
];

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  seed(db);
  return db;
}

function seed(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM projects').get().n === 0) {
    const insert = db.prepare('INSERT INTO projects (title, category, tags, theme, layout, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    SEED_PROJECTS.forEach((p, i) => insert.run(p.title, p.category, JSON.stringify(p.tags), p.theme, p.layout, i));
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM testimonials').get().n === 0) {
    const insert = db.prepare('INSERT INTO testimonials (quote, name, role, sort_order) VALUES (?, ?, ?, ?)');
    SEED_TESTIMONIALS.forEach((t, i) => insert.run(t.quote, t.name, t.role, i));
  }
}
