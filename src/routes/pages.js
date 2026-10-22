import { Router } from 'express';
import { contentTypes } from '../content.js';
import { homePage } from '../views/home.js';
import { projectPage } from '../views/project.js';
import { notFoundPage } from '../views/notFound.js';
import { aboutPage, workPage, servicesPage, serviceDetailPage, contactPage } from '../views/studioPages.js';
import { STUDIO_SERVICES, getStudioService } from '../studioServices.js';
import { getShowcaseProjects } from '../showcase.js';
import { esc } from '../views/html.js';
import { getWorkProjects } from '../workContent.js';

export function pageRoutes({ db, siteStore, config }) {
  const r = Router();
  const { fromRow } = contentTypes.projects;
  const published = db.prepare('SELECT * FROM projects WHERE published = 1 ORDER BY sort_order, id');
  const context = () => {
    const site = siteStore.get();
    return { site, projects: getShowcaseProjects({ site, projects: published.all().map(fromRow) }), siteUrl: config.siteUrl };
  };
  function send(res, page, status = 200) {
    res.status(status).set('Cache-Control', 'no-cache').type('html').send(String(page));
  }
  const origin = (req) => config.siteUrl || `${req.protocol}://${req.get('host')}`;
  r.get('/', (req, res) => send(res, homePage(context())));
  r.get('/about', (req, res) => send(res, aboutPage(context())));
  r.get('/work', (req, res) => {
    const ctx = context();
    send(res, workPage({ ...ctx, projects: getWorkProjects(ctx, published.all().map(fromRow)) }));
  });
  r.get('/services', (req, res) => send(res, servicesPage(context())));
  r.get('/contact', (req, res) => send(res, contactPage(context())));
  r.get('/services/:slug', (req, res, next) => {
    const service = getStudioService(req.params.slug);
    if (!service) return next();
    send(res, serviceDetailPage({ ...context(), service }));
  });
  r.get('/work/:slug', (req, res, next) => {
    const ctx = context();
    let projects = getWorkProjects(ctx, published.all().map(fromRow));
    let index = projects.findIndex((project) => project.slug === req.params.slug);
    if (index === -1) {
      projects = published.all().map(fromRow);
      index = projects.findIndex((project) => project.slug === req.params.slug);
    }
    if (index === -1) return next();
    send(res, projectPage({ ...ctx, project: projects[index], next: projects.length > 1 ? projects[(index + 1) % projects.length] : null }));
  });
  r.get('/sitemap.xml', (req, res) => {
    const base = origin(req);
    const urls = ['/', '/work', '/about', '/services', '/contact', ...STUDIO_SERVICES.map((service) => `/services/${service.slug}`), ...context().projects.map((project) => `/work/${project.slug}`)];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${esc(base + url)}</loc></url>`).join('\n')}\n</urlset>\n`);
  });
  r.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin(req)}/sitemap.xml\n`));
  r.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(404).type('text/plain').send('Not found');
    send(res, notFoundPage({ site: siteStore.get(), siteUrl: config.siteUrl }), 404);
  });
  return r;
}
