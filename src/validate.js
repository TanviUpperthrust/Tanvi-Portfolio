// Tiny schema validator so we don't pull in a dependency for a handful of forms.
// A field spec: { type: 'string'|'int'|'bool'|'tags'|'enum', required, max, min, values, email, url }

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
    }
    out[key] = v;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
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
