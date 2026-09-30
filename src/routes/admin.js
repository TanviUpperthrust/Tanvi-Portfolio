import { Router } from 'express';
import { validate } from '../validate.js';
import { rateLimit } from '../rateLimit.js';
import { contentTypes } from '../content.js';

function notFound(res) {
  return res.status(404).json({ error: 'Not found.' });
}

function idParam(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminRoutes({ db, auth }) {
  const r = Router();

  /* ---------- Session ---------- */
  r.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts. Wait a few minutes.' }), (req, res) => {
    if (!auth.checkPassword(req.body?.password)) return res.status(401).json({ error: 'Wrong password.' });
    auth.issue(res);
    res.json({ ok: true });
  });

  r.post('/logout', (req, res) => {
    auth.clear(res);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => res.json({ authed: auth.isAuthed(req) }));

  r.use(auth.requireAdmin);

  /* ---------- Messages ---------- */
  const q = {
    list: db.prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?'),
    listUnread: db.prepare('SELECT * FROM messages WHERE read_at IS NULL ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?'),
    counts: db.prepare('SELECT COUNT(*) AS total, SUM(read_at IS NULL) AS unread FROM messages'),
    get: db.prepare('SELECT * FROM messages WHERE id = ?'),
    markRead: db.prepare("UPDATE messages SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND read_at IS NULL"),
    markUnread: db.prepare('UPDATE messages SET read_at = NULL WHERE id = ?'),
    del: db.prepare('DELETE FROM messages WHERE id = ?'),
  };

  r.get('/messages', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = (req.query.unread === '1' ? q.listUnread : q.list).all(limit, offset);
    const { total, unread } = q.counts.get();
    res.json({ total, unread: unread ?? 0, items: rows.map((m) => ({ ...m, emailed: Boolean(m.emailed) })) });
  });

  r.patch('/messages/:id', (req, res) => {
    const id = idParam(req);
    if (!id || !q.get.get(id)) return notFound(res);
    const { read } = validate(req.body, { read: { type: 'bool', required: true } });
    (read ? q.markRead : q.markUnread).run(id);
    res.json(q.get.get(id));
  });

  r.delete('/messages/:id', (req, res) => {
    const id = idParam(req);
    if (!id || q.del.run(id).changes === 0) return notFound(res);
    res.status(204).end();
  });

  /* ---------- Projects & testimonials (same CRUD shape) ---------- */
  for (const [path, type] of Object.entries(contentTypes)) {
    const { table, columns, schema, toRow, fromRow } = type;
    const all = db.prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`);
    const get = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    const insert = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`);
    const del = db.prepare(`DELETE FROM ${table} WHERE id = ?`);

    r.get(`/${path}`, (req, res) => res.json(all.all().map(fromRow)));

    r.post(`/${path}`, (req, res) => {
      const row = toRow(validate(req.body, schema));
      const { lastInsertRowid } = insert.run(...columns.map((c) => row[c]));
      res.status(201).json(fromRow(get.get(lastInsertRowid)));
    });

    r.patch(`/${path}/:id`, (req, res) => {
      const id = idParam(req);
      if (!id || !get.get(id)) return notFound(res);
      const row = toRow(validate(req.body, schema, { partial: true }));
      const keys = columns.filter((c) => row[c] !== undefined);
      if (keys.length) {
        // Column names come from our own whitelist, never from the request.
        db.prepare(
          `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
        ).run(...keys.map((k) => row[k]), id);
      }
      res.json(fromRow(get.get(id)));
    });

    r.delete(`/${path}/:id`, (req, res) => {
      const id = idParam(req);
      if (!id || del.run(id).changes === 0) return notFound(res);
      res.status(204).end();
    });
  }

  return r;
}
