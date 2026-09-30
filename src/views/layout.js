import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { html } from './html.js';

export const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

// Cache-busting: append the file's modification time so browsers pick up edits immediately.
export function asset(p) {
  try {
    const v = Math.round(fs.statSync(path.join(PUBLIC_DIR, p)).mtimeMs).toString(36);
    return `/${p}?v=${v}`;
  } catch {
    return `/${p}`;
  }
}

const NAV = [
  ['About', '/#about'],
  ['Services', '/#services'],
  ['Process', '/#process'],
  ['Work', '/#work'],
  ['Kind words', '/#voices'],
];

export function layout({ title, description, path: pagePath = '/', siteUrl, site, body, scripts = [], ogType = 'website', noindex = false }) {
  const canonical = siteUrl && !noindex ? siteUrl + pagePath : null;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
${noindex && html`<meta name="robots" content="noindex" />`}
<meta name="theme-color" content="#07060D" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#FBF9FF" media="(prefers-color-scheme: light)" />
${canonical && html`<link rel="canonical" href="${canonical}" />
<meta property="og:url" content="${canonical}" />`}
<meta property="og:type" content="${ogType}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:site_name" content="Tanvi · UI/UX Designer" />
<meta name="twitter:card" content="summary" />
<link rel="icon" href="${asset('favicon.svg')}" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${asset('assets/css/site.css')}" />
<script src="${asset('assets/js/theme.js')}"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<!-- Interactive background layers -->
<div class="bg-stage" aria-hidden="true">
  <div class="orb a"><div class="orb-inner" data-depth="40"></div></div>
  <div class="orb b"><div class="orb-inner" data-depth="-60"></div></div>
  <div class="orb c"><div class="orb-inner" data-depth="30"></div></div>
  <div class="orb d"><div class="orb-inner" data-depth="-35"></div></div>
</div>
<div class="spotlight" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>
<div class="cursor" aria-hidden="true"></div>

<nav class="nav" id="nav" aria-label="Main">
  <a href="/" class="logo" aria-label="tanvi, home"><span class="logo-dot"></span>tanvi.</a>
  <div class="nav-links">
    ${NAV.map(([label, href]) => html`<a href="${href}">${label}</a>`)}
  </div>
  <div class="nav-right">
    <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle dark / light mode">
      <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
    <a href="/#contact" class="btn small magnetic">Let's talk <span class="arrow">→</span></a>
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
      <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  </div>
</nav>

<div class="mobile-menu" id="mobileMenu">
  ${NAV.map(([label, href]) => html`<a href="${href}">${label}</a>`)}
  <a href="/#contact" class="btn">Let's talk <span class="arrow">→</span></a>
</div>

<main id="main">
${body}
</main>

<footer>
  <div class="container">
    <span>© ${new Date().getFullYear()} Tanvi. Designed with care.</span>
    <span>${site.location}</span>
  </div>
</footer>

<script src="${asset('assets/js/site.js')}"></script>
${scripts.map((s) => html`<script src="${asset('assets/js/' + s)}"></script>`)}
</body>
</html>
`;
}
