import { html } from './html.js';
import { layout } from './layout.js';

export function notFoundPage({ site, siteUrl }) {
  const body = html`
<section class="not-found">
  <div class="container">
    <div class="code grad-text reveal">404</div>
    <h1 class="reveal" data-d="1">This page took a <span class="serif">wrong turn.</span></h1>
    <p class="reveal" data-d="2">The link may be old, or the page may have moved. Let's get you somewhere useful.</p>
    <div class="hero-cta reveal" data-d="3">
      <a href="/" class="btn magnetic">Back to home <span class="arrow">→</span></a>
      <a href="/#work" class="btn ghost magnetic">See my work</a>
    </div>
  </div>
</section>`;

  return layout({
    title: 'Page not found · Tanvi',
    description: 'This page could not be found.',
    path: '/404',
    siteUrl,
    site,
    body,
    noindex: true,
  });
}
