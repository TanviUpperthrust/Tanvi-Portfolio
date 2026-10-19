// Tiny schema validator so we don't pull in a dependency for a handful of forms.
// A field spec: { type: 'string'|'int'|'bool'|'tags'|'enum'|'image'|'sections', required, max, min, values, email, url }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class ValidationError extends Error {
  constructor(fields) {
    super('Please check the highlighted fields.');
    this.status = 400;
    this.fields = fields;
  }
}

export function validate(input, schema, { partial = false } = {}) {
  const out = {};
  const errors = {};
  const body = input && typeof input === 'object' ? input : {};

  for (const [key, spec] of Object.entries(schema)) {
    let v = body[key];
    if (v === undefined || v === null || v === '') {
      if (partial && v === undefined) continue; // field not part of this update
      if (spec.required) errors[key] = 'Required.';
      else out[key] = spec.default ?? (spec.type === 'string' ? '' : null);
      continue;
    }

    switch (spec.type) {
      case 'string': {
        if (typeof v !== 'string') { errors[key] = 'Must be text.'; continue; }
        v = v.trim();
        if (spec.required && !v) { errors[key] = 'Required.'; continue; }
        if (spec.min && v.length < spec.min) { errors[key] = `At least ${spec.min} characters.`; continue; }
        if (spec.max && v.length > spec.max) { errors[key] = `At most ${spec.max} characters.`; continue; }
        if (spec.email && !EMAIL_RE.test(v)) { errors[key] = 'Enter a valid email.'; continue; }
        if (spec.pattern && !spec.pattern.test(v)) { errors[key] = spec.patternMessage || 'Invalid format.'; continue; }
        if (spec.url && v && !isSafeUrl(v)) { errors[key] = 'Use an http(s) link or a #anchor.'; continue; }
        break;
      }
      case 'enum':
        if (!spec.values.includes(v)) { errors[key] = `Must be one of: ${spec.values.join(', ')}.`; continue; }
        break;
      case 'int':
        v = Number(v);
        if (!Number.isInteger(v)) { errors[key] = 'Must be a whole number.'; continue; }
        break;
      case 'bool':
        v = v === true || v === 1 || v === '1' || v === 'true';
        break;
      case 'tags':
        if (typeof v === 'string') v = v.split(',');
        if (!Array.isArray(v)) { errors[key] = 'Must be a list.'; continue; }
        v = v.map((t) => String(t).trim()).filter(Boolean).slice(0, 8).map((t) => t.slice(0, 40));
        break;
      case 'metrics': {
        // Accepts [{ value, label }] or text with one "value | label" per line.
        if (typeof v === 'string') {
          v = v.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
            const i = line.indexOf('|');
            return i === -1 ? { value: line, label: '' } : { value: line.slice(0, i), label: line.slice(i + 1) };
          });
        }
        if (!Array.isArray(v) || v.some((m) => !m || typeof m !== 'object')) { errors[key] = 'Must be a list.'; continue; }
        v = v.map((m) => ({ value: String(m.value ?? '').trim().slice(0, 20), label: String(m.label ?? '').trim().slice(0, 80) }))
          .filter((m) => m.value);
        if (v.length > 6) { errors[key] = 'At most 6 metrics.'; continue; }
        break;
      }
      case 'image':
        if (typeof v !== 'string' || !isSafeImageSource(v.trim())) {
          errors[key] = 'Use an /assets/ image path or an http(s) image URL.';
          continue;
        }
        v = v.trim();
        break;
      case 'sections': {
        const result = projectSections(v);
        if (result.error) { errors[key] = result.error; continue; }
        v = result.sections;
        break;
      }
    }
    out[key] = v;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

// Imported artwork is either served from our asset folder or a normal web URL.
// Reject ambiguous paths before they reach an <img src> attribute or downloader.
export function isSafeImageSource(source) {
  if (typeof source !== 'string' || !source || source.length > 4096 || /[\u0000-\u0020\u007f\\<>"'`]/.test(source)) return false;
  if (source.startsWith('/assets/')) {
    let decoded = source;
    try {
      for (let pass = 0; pass < 4; pass++) {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      }
      if (/[\u0000-\u001f\u007f\\<>"'`]/.test(decoded)) return false;
      const pathname = decoded.split(/[?#]/, 1)[0];
      return pathname.startsWith('/assets/') && pathname.length > '/assets/'.length && !pathname.split('/').some((part) => part === '.' || part === '..');
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(source);
    return /^https?:\/\//i.test(source) && (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

function projectSections(value) {
  if (!Array.isArray(value) || value.length > 100) return { error: 'Provide a list of at most 100 case study sections.' };
  const sections = [];
  for (let index = 0; index < value.length; index++) {
    const section = value[index];
    const label = `Section ${index + 1}`;
    if (!section || typeof section !== 'object' || Array.isArray(section)) return { error: `${label} must be an object.` };
    const heading = section.heading ?? '';
    const body = section.body ?? '';
    const sourceImages = section.images ?? [];
    if (typeof heading !== 'string' || heading.length > 500) return { error: `${label}: heading must be text of at most 500 characters.` };
    if (typeof body !== 'string' || body.length > 50000) return { error: `${label}: body must be text of at most 50000 characters.` };
    if (!Array.isArray(sourceImages) || sourceImages.length > 100) return { error: `${label}: provide at most 100 images.` };
    const images = [];
    for (let imageIndex = 0; imageIndex < sourceImages.length; imageIndex++) {
      const image = sourceImages[imageIndex];
      const imageLabel = `${label}, image ${imageIndex + 1}`;
      if (!image || typeof image !== 'object' || Array.isArray(image)) return { error: `${imageLabel} must be an object.` };
      if (typeof image.src !== 'string' || !isSafeImageSource(image.src.trim())) return { error: `${imageLabel}: use an /assets/ image path or an http(s) image URL.` };
      const alt = image.alt ?? '';
      if (typeof alt !== 'string' || alt.length > 500) return { error: `${imageLabel}: alternative text must be at most 500 characters.` };
      if (image.caption !== undefined && (typeof image.caption !== 'string' || image.caption.length > 2000)) return { error: `${imageLabel}: caption must be text of at most 2000 characters.` };
      images.push({ src: image.src.trim(), alt, ...(image.caption !== undefined && { caption: image.caption }) });
    }
    sections.push({ heading: heading.trim(), body, images });
  }
  return { sections };
}

function isSafeUrl(v) {
  if (v.startsWith('#') || v.startsWith('/')) return !v.startsWith('//');
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
