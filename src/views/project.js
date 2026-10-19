import { html, prose } from './html.js';
import { layout } from './layout.js';
import { projectArt } from './studioParts.js';
import { isSafeImageSource } from '../validate.js';

function projectSections(project) {
  const structured = Array.isArray(project.sections) ? project.sections.filter((section) => section && typeof section === 'object') : [];
  if (structured.length) return structured;
  return [['The challenge', project.challenge], ['The approach', project.approach], ['The outcome', project.outcome]]
    .filter(([, body]) => typeof body === 'string' && body.trim())
    .map(([heading, body]) => ({ heading, body, images: [] }));
}

function sectionContent(section, sectionIndex, projectTitle) {
  const heading = typeof section.heading === 'string' ? section.heading.trim() : '';
  const body = typeof section.body === 'string' ? section.body : '';
  const images = Array.isArray(section.images) ? section.images.filter((image) => image && isSafeImageSource(image.src)) : [];
  if (!heading && !body.trim() && !images.length) return null;
  const headingId = `project-section-${sectionIndex + 1}`;
  return html`<article class="project-content-section"${heading && html` aria-labelledby="${headingId}"`}>
    ${(heading || body.trim()) && html`<div class="story-block project-section-text">
      ${heading && html`<h2 id="${headingId}">${heading}</h2>`}
      ${body.trim() && html`<div class="prose">${prose(body)}</div>`}
    </div>`}
    ${images.length > 0 && html`<div class="project-section-gallery">${images.map((image, imageIndex) => {
      const alt = image.alt || `${projectTitle} — ${heading || 'case study image'} ${imageIndex + 1}`;
      return html`<figure class="project-detail-image"><a href="${image.src}" target="_blank" rel="noopener" aria-label="Open full-size image: ${alt}"><img src="${image.src}" alt="${alt}" loading="lazy" decoding="async" /></a>${image.caption && html`<figcaption>${image.caption}</figcaption>`}</figure>`;
    })}</div>`}
  </article>`;
}

function actionLink(url, label, secondary = false) {
  if (!url) return null;
  return html`<a class="${secondary ? 'outline-button' : 'pill-button'}" href="${url}"${/^https?:/i.test(url) && html` target="_blank" rel="noopener"`}>${label} <span aria-hidden="true">↗</span></a>`;
}

export function projectPage({ project: p, next, site, siteUrl }) {
  const meta = [['Client', p.client], ['Role', p.role], ['Timeline', p.duration], ['Type', p.category], ['Year', p.year]]
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim());
  const cover = isSafeImageSource(p.coverImage) ? p.coverImage : '';
  const sections = projectSections(p);
  const hasActions = !p.template && (p.url || p.prototypeUrl);
  const body = html`<section class="project-hero page-wrap"><a class="back-link" href="/work">← All work</a><p class="page-eyebrow">${p.template ? 'CASE STUDY / IN PREPARATION' : p.category || 'CASE STUDY'}</p><h1 class="display-title" data-kinetic>${p.title}</h1>${p.summary && html`<p class="project-summary" data-reveal>${p.summary}</p>`}
    ${meta.length > 0 && html`<dl class="project-meta">${meta.map(([label, value]) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`)}</dl>`}
    ${hasActions && html`<div class="project-actions" aria-label="Explore this project">${actionLink(p.url, 'View case study')}${actionLink(p.prototypeUrl, 'View prototype', true)}</div>`}
  </section>
  ${cover ? html`<figure class="project-cover-media page-wrap"><img src="${cover}" alt="${p.coverImageAlt || `Cover for ${p.title}`}" decoding="async" fetchpriority="high" /></figure>` : html`<section class="project-cover page-wrap" aria-label="Project visual"><div>${projectArt(p)}</div></section>`}
  <section class="project-story project-story--content page-wrap">${p.template ? html`<article class="story-block" data-reveal><h2>This story is still taking shape.</h2><div class="prose"><p>This is a space for a future UI / UX case study. The project overview, research, design process and outcomes will be added when the work is ready to share.</p><p>The visuals are layout placeholders. There are no project results or client claims here yet.</p><a class="text-link" href="/work">Explore all five spaces <span aria-hidden="true">↗</span></a></div></article>` : sections.map((section, index) => sectionContent(section, index, p.title))}
    ${!p.template && p.metrics?.length > 0 && html`<div class="project-metrics" aria-label="Results">${p.metrics.map((metric) => html`<div><strong>${metric.value}</strong><p>${metric.label}</p></div>`)}</div>`}
  </section>
  ${next && html`<section class="next-project page-wrap"><span class="section-label">NEXT CASE STUDY</span><a href="/work/${next.slug}" data-cursor-label="View"><h2>${next.title}</h2><span aria-hidden="true">↗</span></a></section>`}`;
  return layout({ title: `${p.title} · Case study by Tanvi`, description: p.summary || `A UI / UX case study by Tanvi.`, path: `/work/${p.slug}`, siteUrl, site, body, ogType: 'article', noindex: !!p.template });
}
