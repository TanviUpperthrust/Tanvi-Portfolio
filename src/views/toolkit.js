import { html } from './html.js';
import { PROFILE } from '../portfolioProfile.js';
const logos = { Figma: 'figma', Framer: 'framer', 'VS Code': 'vscode', 'Adobe Illustrator': 'illustrator', 'Adobe Photoshop': 'photoshop' };
export function toolLogo(name) {
  return html`<span class="tool-brand"><img src="/assets/images/tools/${logos[name]}.svg" alt="" width="40" height="40" loading="lazy" decoding="async"></span>`;
}
export function toolkit() {
  return html`<ul class="brand-toolkit">${PROFILE.toolkit.map((tool) => html`<li>${toolLogo(tool)}<div><h3>${tool}</h3><p>${PROFILE.toolkitDescriptions[tool]}</p></div></li>`)}</ul>`;
}

const tools = {
  figma: 'Figma', framer: 'Framer', chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Google Gemini', stitch: 'Google Stitch', runway: 'Runway', canva: 'Canva', napkin: 'Napkin AI',
  html5: 'HTML5', css3: 'CSS3', javascript: 'JavaScript', nextjs: 'Next.js (fundamentals)', nodejs: 'Node.js (fundamentals)', npm: 'npm', vscode: 'VS Code', git: 'Git', gitlab: 'GitLab',
  scholar: 'Google Scholar', perplexity: 'Perplexity', forms: 'Google Forms', lighthouse: 'Lighthouse', wave: 'WAVE', illustrator: 'Adobe Illustrator', photoshop: 'Adobe Photoshop',
};
const serviceTools = {
  'ui-ux-design': ['figma', 'scholar', 'perplexity', 'forms'],
  'website-design': ['figma', 'framer'],
  'ai-powered-design': ['chatgpt', 'claude', 'gemini', 'stitch', 'runway', 'canva', 'napkin'],
  'ai-chatbot-ux': ['figma', 'claude', 'gemini'],
  'frontend-development': ['html5', 'css3', 'javascript', 'nextjs', 'nodejs', 'npm', 'vscode', 'git', 'gitlab'],
  'brand-digital-content': ['illustrator', 'photoshop', 'canva'],
  'ux-research-accessibility': ['scholar', 'perplexity', 'forms', 'lighthouse', 'wave'],
};
export function serviceToolChips(slug) {
  return html`<ul class="service-tool-chips" aria-label="Tools for this service">${(serviceTools[slug] || []).map((icon) => html`<li><img src="/assets/images/tools/${icon}.${['chatgpt', 'claude', 'stitch', 'napkin', 'lighthouse', 'wave', 'scholar', 'perplexity', 'forms'].includes(icon) ? 'png' : 'svg'}" alt="" width="22" height="22" loading="lazy"><span>${tools[icon]}</span></li>`)}</ul>`;
}
