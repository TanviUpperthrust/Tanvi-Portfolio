import { Router } from 'express';
import { validate } from '../validate.js';
import { rateLimit } from '../rateLimit.js';
import { contentTypes } from '../content.js';

export const TOPICS = ['UX research', 'UI design', 'Full product design', 'Design system', 'Prototyping', 'Something else'];
export const BUDGETS = ['Under ₹1L', '₹1L – ₹3L', '₹3L – ₹6L', '₹6L+', 'Not sure yet'];

const contactSchema = {
  name: { type: 'string', required: true, max: 100 },
  email: { type: 'string', required: true, max: 200, email: true },
  topic: { type: 'enum', values: TOPICS },
  budget: { type: 'enum', values: BUDGETS },
  message: { type: 'string', required: true, min: 10, max: 5000 },
};

export function publicRoutes({ db, mailer }) {
  const r = Router();

  r.get('/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  });

  for (const [path, type] of Object.entries(contentTypes)) {
    const list = db.prepare(`SELECT id, ${type.columns.join(', ')} FROM ${type.table} WHERE published = 1 ORDER BY sort_order, id`);
    r.get(`/${path}`, (req, res) => {
      res.set('Cache-Control', 'public, max-age=60');
      res.json(list.all().map(type.fromRow).map(({ published, sort_order, ...rest }) => rest));
    });
  }

  r.get('/contact/options', (req, res) => res.json({ topics: TOPICS, budgets: BUDGETS }));

  const insertMessage = db.prepare(
    'INSERT INTO messages (name, email, topic, budget, message, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const markEmailed = db.prepare('UPDATE messages SET emailed = 1 WHERE id = ?');

  r.post(
    '/contact',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "You've sent a few messages already. Please try again in a little while, or email me directly." }),
    (req, res) => {
      // Honeypot: real visitors never see or fill the "website" field.
      if (req.body?.website) return res.status(201).json({ ok: true });

      const m = validate(req.body, contactSchema);
      const { lastInsertRowid } = insertMessage.run(
        m.name, m.email, m.topic, m.budget, m.message,
        req.ip ?? null, String(req.get('user-agent') ?? '').slice(0, 300)
      );
      const id = Number(lastInsertRowid);

      // Don't make the visitor wait on SMTP; the message is already saved.
      mailer.notifyNewMessage(m)
        .then((sent) => sent && markEmailed.run(id))
        .catch((err) => console.error(`[mail] failed to send notification for message ${id}:`, err.message));

      res.status(201).json({ ok: true });
    }
  );

  return r;
}
