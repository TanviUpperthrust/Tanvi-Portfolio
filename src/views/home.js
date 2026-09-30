import { html, raw, json, emphasis, statValue } from './html.js';
import { shot } from './mocks.js';
import { layout } from './layout.js';
import { TOPICS, BUDGETS } from '../content.js';

const TOOLS = ['Figma', 'FigJam', 'Framer', 'Protopie', 'Maze', 'Notion', 'Adobe XD', 'Spline', 'Webflow', 'Miro'];

const SERVICES = [
  { title: 'UX Research', topic: 'UX research', text: 'Interviews, surveys, competitive audits and usability tests that reveal what users really need, not what we assume.', icon: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' },
  { title: 'Information Architecture', topic: 'Full product design', text: 'Sitemaps, user flows and navigation systems that help people find things without thinking twice.', icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>' },
  { title: 'UI & Visual Design', topic: 'UI design', text: 'Expressive, accessible interfaces with a strong type system, thoughtful colour and details that make people smile.', icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>' },
  { title: 'Prototyping', topic: 'Prototyping', text: 'High-fidelity, interactive prototypes in Figma & Protopie to test ideas quickly and sell them to stakeholders.', icon: '<path d="M5 12h14M12 5l7 7-7 7"/>' },
  { title: 'Design Systems', topic: 'Design system', text: 'Tokens, components and documentation that keep teams consistent and ship features faster.', icon: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>' },
];

const STEPS = [
  ['Discover', 'Stakeholder chats, user interviews and data dives to frame the real problem and define success.'],
  ['Define', "Personas, journey maps and a sharp problem statement so everyone agrees on what we're solving."],
  ['Ideate', 'Sketches, wireframes and flows. Lots of options, quickly narrowed down with the team.'],
  ['Design', 'High-fidelity UI, motion and micro-interactions, built on a reusable component system.'],
  ['Test', 'Usability sessions and A/B checks, then iterate until the numbers and the users agree.'],
  ['Deliver', 'Annotated specs, tokens and close collaboration with devs so the build matches the design.'],
];

// Reveal-animation stagger attribute (fixed numbers, so safe to emit raw).
const d = (i) => raw(i ? ` data-d="${Number(i)}"` : '');

function statCard(s, i) {
  return html`<div class="card stat${i % 2 ? ' tall' : ''} reveal"${d(i)}>
        <span class="tag">${s.tag}</span>
        <div><div class="num${s.accent ? ' grad-text' : ''}">${statValue(s.value)}</div><p>${s.text}</p></div>
      </div>`;
}

export function homePage({ site, projects, testimonials, siteUrl }) {
  const socials = [['LinkedIn', site.linkedin], ['Behance', site.behance], ['Dribbble', site.dribbble]].filter(([, url]) => url);
  const quotes = testimonials.map((t) => ({ html: emphasis(t.quote).toString(), name: t.name, role: t.role }));
  const first = testimonials[0];

  const body = html`
<!-- HERO -->
<section class="hero" id="top">
  <div class="container">
    <div class="status-pill reveal${site.available ? '' : ' off'}"><span class="live"></span> ${site.availability}</div>
    <h1 class="reveal" data-d="1">Designing products<br/>people <span class="serif grad-text">actually love</span></h1>
    <p class="hero-sub reveal" data-d="2">I'm Tanvi, a UI/UX designer who turns messy problems into calm, clear and delightful digital experiences, from first research sketch to pixel-perfect handoff.</p>
    <div class="hero-cta reveal" data-d="3">
      <a href="#work" class="btn magnetic">See my work <span class="arrow">→</span></a>
      <a href="#contact" class="btn ghost magnetic">Get in touch</a>
    </div>

    <div class="marquee-wrap reveal" data-d="4">
      <div class="marquee-label">Tools & teams I've worked with</div>
      <div class="marquee" aria-label="${TOOLS.join(', ')}">
        <div class="marquee-track" aria-hidden="true">
          ${[...TOOLS, ...TOOLS].map((t) => html`<span>${t}</span>`)}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ABOUT / STATS -->
<section id="about">
  <div class="container">
    <div class="sec-head">
      <div>
        <span class="eyebrow reveal">About me</span>
        <h2 class="reveal" data-d="1">Good design has a <span class="serif grad-text">clarity problem</span></h2>
      </div>
      <p class="reveal" data-d="2">Too many products look beautiful and still confuse people. I design for understanding first, then make it beautiful.</p>
    </div>
    <div class="about-grid">
      ${site.stats.map(statCard)}
    </div>
  </div>
</section>

<!-- STATEMENT BAND -->
<section class="band">
  <div class="section-glow" style="width:520px;height:520px;right:-120px;top:-160px;background:var(--pink);"></div>
  <div class="section-glow" style="width:420px;height:420px;left:-140px;bottom:-200px;background:var(--violet);opacity:.5"></div>
  <div class="container band-inner">
    <div class="reveal">
      <small>Pretty screens are easy.</small>
      <h2>Now design the experience <span class="serif">that works.</span></h2>
    </div>
    <div class="reveal" data-d="1">
      <p>Every interface I make starts with <b>real users</b>, a <b>clear goal</b> and a <b>measurable outcome</b>. Visual polish comes after the flow is right, and I never skip it.</p>
      <a href="#process" class="btn magnetic">See how I work <span class="arrow">→</span></a>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="section-glow" style="width:480px;height:480px;right:-160px;top:40px;background:var(--orb-b);"></div>
  <div class="container">
    <div class="sec-head">
      <div>
        <span class="eyebrow reveal">What I do</span>
        <h2 class="reveal" data-d="1">Turn ideas into <span class="serif grad-text">usable products</span></h2>
      </div>
      <p class="reveal" data-d="2">Hire me for a single piece of the puzzle or the whole journey. Every service ends in a clean, dev-ready handoff.</p>
    </div>
    <div class="services">
      ${SERVICES.map((s, i) => html`<article class="card service reveal"${d(i % 3)}>
        <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${raw(s.icon)}</svg></div>
        <h3>${s.title}</h3>
        <p>${s.text}</p>
        <a href="#contact" class="more" data-topic="${s.topic}">Ask about this <span>→</span></a>
      </article>`)}
      <a href="#contact" class="card service cta reveal" data-d="2">
        <div class="blob"></div>
        <h3>Let's build<br/>something <span class="serif">lovely</span> together →</h3>
      </a>
    </div>
  </div>
</section>

<!-- PROCESS -->
<section class="process" id="process">
  <div class="container">
    <div class="sec-head">
      <div>
        <span class="eyebrow reveal">Process</span>
        <h2 class="reveal" data-d="1">How I take a project from <span class="serif grad-text">fuzzy to finished</span></h2>
      </div>
      <div class="steps-nav reveal" data-d="2">
        <button class="round-btn" id="stepPrev" type="button" aria-label="Previous step">←</button>
        <button class="round-btn" id="stepNext" type="button" aria-label="Next step">→</button>
      </div>
    </div>
    <div class="steps" id="steps">
      ${STEPS.map(([title, text], i) => html`<div class="card step"><span class="n grad-text">${String(i + 1).padStart(2, '0')}</span><h3>${title}</h3><p>${text}</p></div>`)}
    </div>
  </div>
</section>

<!-- WORK -->
<section id="work">
  <div class="section-glow" style="width:500px;height:500px;left:-200px;top:30%;background:var(--orb-c);"></div>
  <div class="container">
    <div class="sec-head">
      <div>
        <span class="eyebrow reveal">Selected work</span>
        <h2 class="reveal" data-d="1">Case studies with <span class="serif grad-text">real outcomes</span></h2>
      </div>
      <p class="reveal" data-d="2">A few favourite projects. Each case study covers the problem, the process and what changed.</p>
    </div>
    <div class="work-list">
      ${projects.map((p, i) => html`<a href="/work/${p.slug}" class="card project reveal"${d(i % 2)}>
        ${shot(p)}
        <div class="meta"><div><h3>${p.title}</h3><div class="cat">${p.category}</div></div><div class="chips">${p.tags.map((t) => html`<span class="chip">${t}</span>`)}</div></div>
      </a>`)}
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="voices" id="voices">
  <div class="section-glow" style="width:560px;height:560px;right:-200px;top:-200px;background:var(--violet);opacity:.35"></div>
  <div class="section-glow" style="width:460px;height:460px;left:-160px;bottom:-240px;background:var(--indigo);opacity:.3"></div>
  <div class="container">
    <div class="sec-head">
      <div>
        <span class="eyebrow reveal">Kind words</span>
        <h2 class="reveal" data-d="1">What clients & teams <span class="serif">say</span></h2>
      </div>
    </div>
    <div class="voice-stats">
      ${site.highlights.map((h, i) => html`<div class="card reveal"${d(i)}><div class="num grad-text">${statValue(h.value)}</div><p>${h.text}</p></div>`)}
    </div>
    ${first && html`<div class="reveal">
      <span class="quote-mark" aria-hidden="true">“</span>
      <div class="fade-swap" id="quoteBox" aria-live="polite">
        <p class="quote" id="quoteText">${emphasis(first.quote)}</p>
        <div class="quote-foot">
          <div class="who"><b id="quoteName">${first.name}</b><span id="quoteRole">${first.role}</span></div>
          ${testimonials.length > 1 && html`<div class="steps-nav">
            <button class="round-btn" id="qPrev" type="button" aria-label="Previous testimonial">←</button>
            <button class="round-btn" id="qNext" type="button" aria-label="Next testimonial">→</button>
          </div>`}
        </div>
      </div>
    </div>
    <script type="application/json" id="quotesData">${json(quotes)}</script>`}
  </div>
</section>

<!-- CONTACT -->
<section class="contact" id="contact">
  <div class="section-glow" style="width:620px;height:620px;left:50%;top:50%;translate:-50% -50%;background:var(--orb-a);opacity:.55"></div>
  <div class="container">
    <span class="eyebrow reveal">Contact</span>
    <h2 class="reveal" data-d="1">Let's make it <span class="serif grad-text">together.</span></h2>
    <p class="reveal" data-d="2">Have a product idea, a redesign or a messy flow that needs love? I'd love to hear about it.</p>

    <form class="card contact-form reveal" data-d="3" id="contactForm" data-email="${site.email}" novalidate>
      <div class="field">
        <label for="cf-name">Your name</label>
        <input id="cf-name" name="name" autocomplete="name" maxlength="100" required />
        <span class="err" data-for="name"></span>
      </div>
      <div class="field">
        <label for="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" autocomplete="email" maxlength="200" required />
        <span class="err" data-for="email"></span>
      </div>
      <div class="field">
        <label for="cf-topic">Project type <span class="opt">(optional)</span></label>
        <select id="cf-topic" name="topic">
          <option value="">Choose one</option>
          ${TOPICS.map((t) => html`<option>${t}</option>`)}
        </select>
        <span class="err" data-for="topic"></span>
      </div>
      <div class="field">
        <label for="cf-budget">Budget <span class="opt">(optional)</span></label>
        <select id="cf-budget" name="budget">
          <option value="">Choose one</option>
          ${BUDGETS.map((b) => html`<option>${b}</option>`)}
        </select>
        <span class="err" data-for="budget"></span>
      </div>
      <div class="field full">
        <label for="cf-message">Tell me about it</label>
        <textarea id="cf-message" name="message" maxlength="5000" required placeholder="What are you building, who is it for, and what's getting in the way?"></textarea>
        <span class="err" data-for="message"></span>
      </div>
      <div class="hp" aria-hidden="true">
        <label for="cf-website">Leave this empty</label>
        <input id="cf-website" name="website" tabindex="-1" autocomplete="off" />
      </div>
      <div class="form-foot">
        <span class="form-status" id="formStatus" role="status" aria-live="polite">I usually reply within two working days.</span>
        <button type="submit" class="btn magnetic">Send message <span class="arrow">→</span></button>
      </div>
    </form>

    <a href="mailto:${site.email}" class="email-link reveal" data-d="3">${site.email}</a>
    ${socials.length > 0 && html`<div class="socials reveal" data-d="4">
      ${socials.map(([label, url]) => html`<a href="${url}" class="btn ghost small magnetic" target="_blank" rel="noopener me">${label} <span class="arrow">↗</span></a>`)}
    </div>`}
  </div>
</section>
`;

  return layout({
    title: 'Tanvi — UI/UX Designer',
    description: 'Tanvi is a UI/UX designer crafting calm, clear, human product experiences.',
    path: '/',
    siteUrl,
    site,
    body,
    scripts: ['home.js'],
  });
}
