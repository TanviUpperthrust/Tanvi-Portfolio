// Minimal HTML templating: interpolated values are escaped unless wrapped in raw().
// Arrays are joined, and null/undefined/false render as nothing.

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Raw(String(s));

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new Raw(out);
}

// Safe to drop inside <script type="application/json">.
export function json(data) {
  return raw(JSON.stringify(data).replace(/</g, '\\u003c'));
}

/* ---------- Content formatting ---------- */

// *word* → serif italic emphasis. Input is escaped first.
export function emphasis(text) {
  return raw(esc(text).replace(/\*([^*\n]+)\*/g, '<em>$1</em>'));
}

// Plain text → paragraphs; consecutive "- " lines become a bullet list.
export function prose(text) {
  const blocks = String(text || '').trim().split(/\n\s*\n/);
  return raw(blocks.filter(Boolean).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => /^[-•]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${emphasis(l.replace(/^[-•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map((l) => emphasis(l).s).join('<br>')}</p>`;
  }).join(''));
}

// "120+" → 120<sup>+</sup>, matching the original stat styling.
export function statValue(v) {
  const s = String(v);
  return s.length > 1 && s.endsWith('+') ? html`${s.slice(0, -1)}<sup>+</sup>` : html`${s}`;
}
