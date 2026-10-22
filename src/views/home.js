import { html } from './html.js';
import { layout } from './layout.js';
import { projectArt } from './studioParts.js';
import { STUDIO_SERVICES } from '../studioServices.js';
import { getShowcaseProjects } from '../showcase.js';
import { servicesBoard } from './serviceCards.js';
import { certificationsSection } from './certifications.js';
import { PROFILE } from '../portfolioProfile.js';

const letters = (text) => [...text].map((letter) => html`<span data-hero-letter aria-hidden="true">${letter}</span>`);

export function homePage({ site, projects = [], siteUrl }) {
  projects = getShowcaseProjects({ site, projects });
  const body = html`<section class="home-hero" id="top"><div class="page-wrap">
    <div class="hero-meta mono"><span>UI / UX DESIGNER</span><span class="hero-availability${site.available === false ? ' is-unavailable' : ''}"><i aria-hidden="true"></i>${String(site.availability).replace(/\s*·\s*\d{4}\s*$/, "")}</span></div>
    <h1 class="home-name" aria-label="Tanvi, UI/UX designer"><span class="name-line">${letters('TANVI')}</span><span class="name-line">${letters('DESIGNER')}</span></h1>
    <div class="hero-baseline"><p>Designing thoughtful and intuitive digital experiences seamlessly.</p><a class="outline-button" href="/work">See the work <span aria-hidden="true">→</span></a></div>
  </div></section>
  <div class="studio-marquee" aria-hidden="true"><div class="marquee-track">${[0, 1, 2, 3].map(() => html`<span>Research <i>✦</i> Design <i>✦</i> Prototyping <i>✦</i> Systems <i>✦</i> Motion <i>✦</i></span>`)}</div></div>
  <section class="selected-work page-wrap" id="work"><div class="section-head mono"><h2 class="section-label">SELECTED WORK (${String(projects.length).padStart(2, '0')})</h2><span>${projects.some(project => project.template) ? 'IN THE MAKING' : 'DESIGN & RESEARCH'}</span></div>
    <div class="featured-layout"><div class="featured-index">${projects.map((project, index) => html`<a class="featured-row${index === 0 ? ' is-active' : ''}" href="/work/${project.slug}" data-featured-index="${index}" data-cursor-label="View"${project.template && html` data-project-template="true"`}><span class="featured-row-number mono">${String(index + 1).padStart(2, '0')}</span><div class="featured-row-body"><h3>${project.title}</h3><p class="mono">${project.template ? 'CASE STUDY COMING SOON' : project.category}</p></div><span class="featured-row-year mono">${project.year || 'CASE STUDY'}</span><span class="featured-row-arrow" aria-hidden="true">↗</span><div class="featured-mobile-art">${projectArt(project)}</div></a>`)}</div>
      <div class="featured-preview"><div class="preview-stack">${projects.map((project, index) => html`<article class="preview-slide${index === 0 ? ' is-active' : ''}" data-featured-slide="${index}"${index !== 0 && html` inert`}><a class="project-art-link" href="/work/${project.slug}" aria-label="View ${project.title}" data-cursor-label="View">${projectArt(project)}</a><div class="preview-caption mono"><span>${String(index + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}</span><span>${project.category}</span></div></article>`)}</div></div>
    </div>
  </section>
  <section class="about-teaser page-wrap" id="about"><p class="section-label" data-reveal>A LITTLE ABOUT ME</p><p class="about-statement" data-reveal>Expressive by <span class="hl">nature.</span><br>Inventive in the <span class="hl">process.</span><br><em>Thoughtful in the <span class="hl">details.</span></em></p><div class="about-teaser-bottom"><p class="home-lead" data-reveal>${PROFILE.lead.split(/(?<=\.) /).map(sentence => html`<span>${sentence}</span>`)}</p><a class="text-link" href="/about">More about me <span aria-hidden="true">↗</span></a></div></section>
  <section class="home-services page-wrap" id="services"><h2 class="services-board-title" data-reveal>Good design,<br>from the <em>inside out.</em></h2>${servicesBoard(STUDIO_SERVICES)}</section>
  ${certificationsSection()}`;
  return layout({ title: 'Tanvi — UI / UX Designer', description: 'Thoughtful digital experiences, expressive interfaces and an inventive approach to design. Explore Tanvi’s UI / UX portfolio.', siteUrl, site, body });
}
