import { raw, html } from './html.js';
import { THEMES } from '../content.js';

// Decorative device mockups for project cards. Markup is fixed; only the key is chosen by content.
const MOCKS = {
  'phone': '<div class="mock"><i style="height:10px;width:40%"></i><i class="hl" style="height:90px"></i><i style="height:12px;width:70%"></i><i style="height:12px;width:55%"></i><i style="flex:1"></i></div>',
  'wide': '<div class="mock wide"><i style="height:10px;width:30%"></i><div style="display:flex;gap:8px;flex:1"><i style="flex:1"></i><i class="hl" style="flex:2"></i></div></div>',
  'phone-profile': '<div class="mock"><i class="hl" style="height:60px;border-radius:50%;width:60px;align-self:center"></i><i style="height:12px;width:60%;align-self:center"></i><i style="flex:1"></i><i style="height:34px"></i></div>',
  'wide-sidebar': '<div class="mock wide"><div style="display:flex;gap:8px;flex:1"><i style="width:22%"></i><div style="flex:1;display:flex;flex-direction:column;gap:8px"><i class="hl" style="height:40%"></i><i style="flex:1"></i></div></div></div>',
};

export function shot(project) {
  const theme = THEMES.includes(project.theme) ? project.theme : 's1';
  return html`<div class="shot ${theme}" aria-hidden="true">${raw(MOCKS[project.layout] || MOCKS.phone)}</div>`;
}
