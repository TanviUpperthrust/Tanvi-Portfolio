import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { html, raw, esc } from './html.js';
import { PROFILE } from '../portfolioProfile.js';

export const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');
export function asset(p) {
  try { return `/${p}?v=${Math.round(fs.statSync(path.join(PUBLIC_DIR, p)).mtimeMs).toString(36)}`; }
  catch { return `/${p}`; }
}
const NAV = [['Work', '/work'], ['About', '/about'], ['Services', '/services']];

export function layout({ title, description, path: pagePath = '/', siteUrl, site, body, scripts = [], ogType = 'website', noindex = false }) {
  const canonical = siteUrl && !noindex ? siteUrl + pagePath : null;
  const active = (href) => pagePath === href || pagePath.startsWith(href + '/');
  const SOCIAL_ICONS = {
  Instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  LinkedIn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>',
  Behance: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/></svg>',
};
  const socials = [['Instagram', site.instagram], ['LinkedIn', site.linkedin || PROFILE.linkedin], ['Behance', site.behance]];
  return html`<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title><meta name="description" content="${description}" /><meta name="theme-color" content="#f5f3ed" /><meta name="color-scheme" content="light dark" />
<script src="${asset('assets/js/appearance.js')}"></script>
${noindex && html`<meta name="robots" content="noindex" />`}
${canonical && html`<link rel="canonical" href="${canonical}" /><meta property="og:url" content="${canonical}" />`}
<meta property="og:type" content="${ogType}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:site_name" content="Tanvi · UI/UX Designer" /><meta name="twitter:card" content="summary" />
<link rel="icon" href="${asset('favicon.svg')}" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${asset('assets/css/studio.css')}" />
<link rel="stylesheet" href="${asset('assets/css/content.css')}" />
<link rel="stylesheet" href="${asset('assets/css/project-content.css')}" />
<link rel="stylesheet" href="${asset('assets/css/appearance.css')}" />
</head>
<body class="studio-site">
<a class="skip-link" href="#main">Skip to content</a><div class="grain-layer" aria-hidden="true"></div>
<header class="site-header" id="siteHeader">
  <a class="site-logo" href="/" aria-label="Tanvi, home">TANVI<span class="logo-script">design</span></a>
  <nav class="desktop-nav" aria-label="Main">${NAV.map(([label, href]) => html`<a href="${href}"${active(href) && html` aria-current="page"`}>${label}</a>`)}</nav>
  <div class="header-actions">
    <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to dark mode" aria-pressed="false" title="Switch to dark mode">
      <svg data-theme-icon="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 13.3A8.8 8.8 0 0 1 10.7 3.2 8.8 8.8 0 1 0 20.8 13.3Z"/></svg>
      <svg data-theme-icon="light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
    <a class="header-cta" href="/contact" data-cursor-label="Say hi">Start a project</a>
    <button class="menu-button" id="menuToggle" type="button" aria-controls="siteMenu" aria-expanded="false"><span class="menu-icon" aria-hidden="true"></span><span>Menu</span></button>
  </div>
</header>
<div class="site-menu" id="siteMenu" hidden inert><nav class="menu-links" aria-label="All pages">${[['Home', '/'], ...NAV, ['Contact', '/contact']].map(([label, href], index) => html`<a href="${href}"${pagePath === href && html` aria-current="page"`}><span class="mono">0${index + 1}</span>${label}<span aria-hidden="true">↗</span></a>`)}</nav><div class="menu-meta"><a href="mailto:${site.email}">${site.email}</a><span>${site.location}</span></div></div>
<main class="site-main" id="main">${body}</main>
<footer class="site-footer" id="contact"><div class="page-wrap"><p class="footer-eyebrow mono">GOT SOMETHING IN MIND?</p><a class="footer-title" href="/contact" data-footer-cta data-cursor-label="Let's go" aria-label="Let's talk about your project"><span class="footer-title-text" data-kinetic-footer>LET'S TALK</span></a><div class="footer-grid"><div class="footer-contact-links"><a href="mailto:${site.email}">${site.email}</a><a href="${PROFILE.phoneHref}">${PROFILE.phone}</a></div><div class="footer-socials">${socials.map(([label, url]) => raw(`<a class="social-icon" href="${url ? esc(url) : '#'}" aria-label="${label}"${url ? ' target="_blank" rel="noopener me"' : ''}>${SOCIAL_ICONS[label]}</a>`))}</div></div><div class="footer-bottom mono"><span>© ${new Date().getFullYear()} Tanvi Jain. Designed with intention.</span><button type="button" data-top>Back to top ↑</button></div></div></footer>
<div class="cursor-aura" aria-hidden="true"></div><div class="custom-cursor" aria-hidden="true"><span class="cursor-label"></span></div><div class="page-transition" id="pageTransition" aria-hidden="true"><div class="transition-bars">${Array.from({ length: 5 }, () => html`<span></span>`)}</div><span class="transition-title"></span></div>
<script src="${asset('assets/js/studio.js')}"></script>${scripts.map(script => html`<script src="${asset('assets/js/' + script)}"></script>`)}
</body></html>`;
}
