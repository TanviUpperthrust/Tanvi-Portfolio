import { Router } from 'express';
import { contentTypes } from '../content.js';
import { homePage } from '../views/home.js';
import { projectPage } from '../views/project.js';
import { notFoundPage } from '../views/notFound.js';
import { esc } from '../views/html.js';

// Server-rendered public pages. Content comes straight from the database, so
// admin edits show up on the next page load.
export function pageRoutes({ db, siteStore, config }) {
  const r = Router();
  const { fromRow } = contentTypes.projects;

  const q = {
    projects: db.prepare('SELECT * FROM projects WHERE published = 1 ORDER BY sort_order, id'),
    testimonials: db.prepare('SELECT * FROM testimonials WHERE published = 1 ORDER BY sort_order, id'),
  };

  function send(res, page, status = 200) {
    res.status(status).set('Cache-Control', 'no-cache').type('html').send(String(page));
  }
  const origin = (req) => config.siteUrl || `${req.protocol}://${req.get('host')}`;

  r.get('/', (req, res) => {
    send(res, homePage({
      site: siteStore.get(),
      projects: q.projects.all().map(fromRow),
      testimonials: q.testimonials.all(),
      siteUrl: config.siteUrl,
    }));
  });

  r.get('/work/:slug', (req, res, next) => {
    const projects = q.projects.all().map(fromRow);
    const i = projects.findIndex((p) => p.slug === req.params.slug);
    if (i === -1) return next();
    const nextProject = projects.length > 1 ? projects[(i + 1) % projects.length] : null;
    send(res, projectPage({ project: projects[i], next: nextProject, site: siteStore.get(), siteUrl: config.siteUrl }));
  });

  r.get('/sitemap.xml', (req, res) => {
    const base = origin(req);
    const urls = ['/', ...q.projects.all().map((p) => `/work/${p.slug}`)];
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join('\n') +
      '\n</urlset>\n'
    );
  });

  r.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin(req)}/sitemap.xml\n`);
  });

  // Anything else that wants a page gets the styled 404.
  r.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(404).type('text/plain').send('Not found');
    send(res, notFoundPage({ site: siteStore.get(), siteUrl: config.siteUrl }), 404);
  });

  return r;
}
