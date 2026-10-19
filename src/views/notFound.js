import { html } from './html.js';
import { layout } from './layout.js';

export function notFoundPage({ site, siteUrl }) {
  const body = html`<section class="page-hero not-found"><div class="page-wrap"><p class="page-eyebrow">THIS PAGE TOOK A WRONG TURN</p><h1 class="display-title">404</h1><p class="page-intro">The link may be old, or the page may have moved. Let's get you somewhere useful.</p><a class="pill-button" href="/">Back to home <span aria-hidden="true">↗</span></a></div></section>`;
  return layout({ title: 'Page not found · Tanvi', description: 'This page could not be found.', path: '/404', siteUrl, site, body, noindex: true });
}
