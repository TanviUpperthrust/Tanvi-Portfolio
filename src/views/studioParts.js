import { html } from './html.js';
import { isSafeImageSource } from '../validate.js';

export function projectArt(project, { detail = false } = {}) {
  if (isSafeImageSource(project.coverImage)) {
    return html`<div class="project-art has-cover${detail ? ' art-detail' : ''}" aria-hidden="true"><img class="fullcover" src="${project.coverImage}" alt="" loading="lazy" decoding="async" /></div>`;
  }
  const seed = Number(project.number || project.id || 1);
  const index = Number.isFinite(seed) ? (seed - 1) % 5 : 0;
  const phone = String(project.layout || '').startsWith('phone');
  return html`<div class="project-art${detail ? ' art-detail' : ''}" data-art="${index}" aria-hidden="true"><div class="art-orbit"></div><span class="art-label">${project.template ? 'CASE STUDY / IN THE MAKING' : project.category}</span><div class="${phone ? 'art-phone' : 'art-window'}"><div class="art-toolbar"><i></i><i></i><i></i></div><div class="art-canvas"><span class="art-kicker">${project.template ? 'A NEW PERSPECTIVE' : project.title}</span><b>${project.template ? (detail ? 'The little details.' : 'Make room for better.') : project.title}</b><div class="art-line"></div><div class="art-line short"></div><div class="art-chart"><i></i><i></i><i></i><i></i><i></i></div><div class="art-bottom"><em></em><em></em><em></em></div></div></div><span class="art-number">${project.number || String(index + 1).padStart(2, '0')}</span></div>`;
}

export function projectCard(project) {
  return html`<a class="project-card reveal" href="/work/${project.slug}" data-cursor-label="View"${project.template && html` data-project-template="true"`}><div class="project-card-art">${projectArt(project)}</div><div class="project-card-meta"><h2>${project.title}</h2><span class="mono">${project.year || 'Case study'}</span><p>${project.category}</p><span class="project-card-arrow" aria-hidden="true">↗</span></div></a>`;
}
