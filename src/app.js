import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { createAuth } from './auth.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function createApp({ config, db, mailer }) {
  const app = express();
  const auth = createAuth(config);

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    next();
  });

  app.use('/api', express.json({ limit: '32kb' }));
  app.use('/api', publicRoutes({ db, mailer }));
  app.use('/api/admin', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  }, adminRoutes({ db, auth }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h' }));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong on our side.' });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That message is too long.' });
    res.status(status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
  });

  return app;
}
