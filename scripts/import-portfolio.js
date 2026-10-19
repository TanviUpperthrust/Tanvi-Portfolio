import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db.js';
import { importPortfolio } from '../src/importPortfolio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig();
const databasePath = path.resolve(root, config.databasePath);
if (!databasePath.startsWith(root + path.sep)) throw new Error('Run this import against a database inside the portfolio workspace.');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/portfolio-import.json'), 'utf8'));
const db = openDatabase(databasePath);
try {
  const imported = db.prepare('SELECT value FROM settings WHERE key = ?').get('framer-portfolio-import-v1');
  if (!imported) {
    const backupPath = path.join(path.dirname(databasePath), `portfolio-before-framer-${Date.now()}.db`);
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
    console.log(`Database backup: ${path.relative(root, backupPath)}`);
  }
  const result = importPortfolio(db, manifest, path.join(root, 'public'));
  console.log(JSON.stringify(result));
} finally {
  db.close();
}
