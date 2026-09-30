import { html, prose } from './html.js';
import { shot } from './mocks.js';
import { layout } from './layout.js';

// "Paisa: Budgeting App" → "Paisa: <em>Budgeting App</em>" for the serif accent in the title.
function title(t) {
  const i = t.indexOf(':');
  return i === -1 ? html`${t}` : html`${t.slice(0, i + 1)} <span class="serif grad-text">${t.slice(i + 1).trim()}</span>`;
}

function block(heading, accent, text) {
  if (!text || !text.trim()) return null;
  return html`<div class="cs-block reveal">
      <h2>${heading} <span class="serif">${accent}</span></h2>
      <div class="prose">${prose(text)}</div>
    </div>`;
}

export function projectPage({ project: p, next, site, siteUrl }) {
  const meta = [['Client', p.client], ['Role', p.role], ['Timeline', p.duration]].filter(([, v]) => v);
  const external = /^https?:/i.test(p.url);
  const sections = [
    block('The', 'challenge', p.challenge),
    block('The', 'approach', p.approach),
    block('The', 'outcome', p.outcome),
  ].filter(Boolean);

  const body = html`
<section class="cs-hero">
  <div class="container">
    <a href="/#work" class="back-link reveal">← All work</a>
    <span class="eyebrow reveal" data-d="1">${p.category || 'Case study'}</span>
    <h1 class="reveal" data-d="1">${title(p.title)}</h1>
    ${p.summary && html`<p class="cs-summary reveal" data-d="2">${p.summary}</p>`}
    <dl class="cs-meta reveal" data-d="3">
      ${meta.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}
      ${p.tags.length > 0 && html`<div><dt>Services</dt><dd class="chips">${p.tags.map((t) => html`<span class="chip">${t}</span>`)}</dd></div>`}
    </dl>
  </div>
</section>

<section class="cs-cover">
  <div class="container reveal">${shot(p)}</div>
</section>

${p.metrics.length > 0 && html`<section class="cs-section" aria-label="Results">
  <div class="container cs-metrics">
    ${p.metrics.map((m, i) => html`<div class="card reveal" data-d="${i % 4}"><div class="num grad-text">${m.value}</div>${m.label && html`<p>${m.label}</p>`}</div>`)}
  </div>
</section>`}

${sections.length > 0 && html`<section class="cs-section">
  <div class="container">
    ${sections}
    ${p.url && html`<div class="cs-live reveal"><a href="${p.url}" class="btn magnetic"${external ? html` target="_blank" rel="noopener"` : ''}>${external ? 'View the live project' : 'Learn more'} <span class="arrow">↗</span></a></div>`}
  </div>
</section>`}

${next && html`<section class="cs-next">
  <div class="container">
    <a href="/work/${next.slug}" class="card next-card reveal">
      ${shot(next)}
      <div>
        <span class="label">Next case study</span>
        <h3>${next.title}</h3>
        <div class="cat">${next.category}</div>
        <span class="go">Read it <span>→</span></span>
      </div>
    </a>
  </div>
</section>`}

<section class="band">
  <div class="section-glow" style="width:520px;height:520px;right:-120px;top:-160px;background:var(--pink);"></div>
  <div class="container band-inner">
    <div class="reveal">
      <small>Working on something similar?</small>
      <h2>Let's make it <span class="serif">together.</span></h2>
    </div>
    <div class="reveal" data-d="1">
      <p>Tell me about your product, your users and what's getting in the way. I reply within two working days.</p>
      <a href="/#contact" class="btn magnetic">Start a project <span class="arrow">→</span></a>
    </div>
  </div>
</section>
`;

  return layout({
    title: `${p.title} · Case study by Tanvi`,
    description: p.summary || `${p.title}: a UI/UX case study by Tanvi.`,
    path: `/work/${p.slug}`,
    siteUrl,
    site,
    body,
    ogType: 'article',
  });
}
