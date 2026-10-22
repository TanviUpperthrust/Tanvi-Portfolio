import { html } from './html.js';

const diagram = {
  'ui-ux-design': () => html`<div class="board-visual visual-product" aria-hidden="true"><div class="product-flow"><div class="flow-screen flow-wire"><span class="flow-bar"><i></i><i></i><i></i></span><span class="flow-heading"></span><span class="flow-line"></span><span class="flow-line short"></span><div class="flow-panels"><i></i><i></i></div></div><span class="flow-connector"></span><div class="flow-screen flow-design"><span class="flow-bar"><i></i><i></i><i></i></span><span class="flow-heading"></span><span class="flow-line"></span><div class="flow-panels"><i></i><i></i></div></div><span class="flow-connector"></span><div class="flow-screen flow-finish"><span class="flow-bar"><i></i><i></i><i></i></span><span class="flow-heading"></span><span class="flow-line"></span><div class="flow-panels"><i></i><i></i></div><span class="flow-button"></span></div></div><span class="visual-caption">A QUESTION → A CLEARER EXPERIENCE</span></div>`,
  'ux-research-accessibility': () => html`<div class="board-visual visual-research" aria-hidden="true"><div class="research-orbit"><span class="research-core">?</span><i class="research-person person-one"></i><i class="research-person person-two"></i><i class="research-person person-three"></i><span class="research-question question-one">why?</span><span class="research-question question-two">what if?</span></div></div>`,
  'website-design': () => html`<div class="board-visual visual-ui" aria-hidden="true"><div class="ui-type">Aa<span>01 / TYPE & TONE</span></div><div class="ui-controls"><span class="ui-toggle"><i></i></span><span class="ui-slider"><i></i></span><span class="ui-slider short"><i></i></span></div></div>`,
  'frontend-development': () => html`<div class="board-visual visual-system" aria-hidden="true"><div class="system-grid"><span class="system-colours"><i></i><i></i><i></i></span><span class="system-type">Aa</span><span class="system-button"></span><span class="system-fields"><i></i><i></i></span><span class="system-checkboxes"><i></i><i></i><i></i></span><span class="system-avatar"><i></i><i></i></span></div></div>`,
  'ai-powered-design': () => html`<div class="board-visual visual-prototype" aria-hidden="true"><div class="prototype-frame frame-start"><i></i><b></b><span></span></div><div class="prototype-path"><i class="prototype-dot"></i></div><div class="prototype-frame frame-end"><i></i><b></b><span></span></div><span class="prototype-pointer">↗</span></div>`,
  'ai-chatbot-ux': () => diagram['ux-research-accessibility'](),
  'brand-digital-content': () => diagram['website-design'](),
};

const bestFor = {
  'ui-ux-design': 'A new app, dashboard or product feature',
  'website-design': 'A new website or a site that needs a rethink',
  'ai-powered-design': 'Exploring concepts and producing creative assets',
  'ai-chatbot-ux': 'An assistant that needs clearer conversations',
  'frontend-development': 'Turning approved designs into working pages',
  'brand-digital-content': 'Consistent visuals for your digital presence',
  'ux-research-accessibility': 'Finding what confuses or excludes your users',
};
export function servicesBoard(services = [], { detailed = false } = {}) {
  return html`<div class="services-board${detailed ? ' services-board--detailed' : ''}">${services.map((service, index) => {
    const draw = diagram[service.slug] || diagram['website-design'];
    const firstSentence = String(service.description || '').split(/(?<=\.)\s+/)[0];
    const product = service.slug === 'ui-ux-design';
    return html`<a class="service-card${product ? ' service-card--product' : ''}" href="/services/${service.slug}" data-reveal data-cursor-label="Explore"><div class="service-card-top"><span class="service-card-number">${String(index + 1).padStart(2, '0')}</span><span class="service-card-arrow" aria-hidden="true">↗</span></div><div class="service-card-copy"><h3>${service.title}</h3><p>${detailed ? service.description : firstSentence}</p></div>${draw()}${detailed && html`<div class="service-best"><span>BEST FOR</span><p>${bestFor[service.slug]}</p></div>`}<div class="service-card-tags">${(service.tags || []).slice(0, detailed ? 4 : 2).map((tag) => html`<span>${tag}</span>`)}</div>${detailed && html`<span class="service-explore">Explore the service <span aria-hidden="true">↗</span></span>`}</a>`;
  })}</div>`;
}
