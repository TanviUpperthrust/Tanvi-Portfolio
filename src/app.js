import express from 'express';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { pageRoutes } from './routes/pages.js';
import { createAuth } from './auth.js';
import { createSiteStore } from './site.js';
import { PUBLIC_DIR } from './views/layout.js';

// All JavaScript lives in /assets, so inline scripts are blocked outright.
// Inline *styles* stay allowed for the decorative glow/mockup style attributes.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

export function createApp({ config, db, mailer }) {
  const app = express();
  const auth = createAuth(config);
  const siteStore = createSiteStore(db);

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

  app.use('/api', express.json({ limit: '64kb' }));
  app.use('/api', publicRoutes({ db, mailer, siteStore }));
  app.use('/api/admin', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  }, adminRoutes({ db, auth, siteStore }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // Asset URLs carry a ?v= version, so they can be cached for a long time.
  app.use('/assets', express.static(`${PUBLIC_DIR}/assets`, { maxAge: '30d', fallthrough: true }));
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false, maxAge: '1h' }));
  app.use(pageRoutes({ db, siteStore, config }));

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
