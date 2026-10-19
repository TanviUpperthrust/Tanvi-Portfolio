import { validate, ValidationError } from './validate.js';
import { DEFAULT_SITE } from './seed.js';

// Site-wide settings (availability, contact details, socials, headline stats),
// stored as one JSON document under the "site" key.

const schema = {
  showProjectTemplates: { type: 'bool', default: true },
  available: { type: 'bool', default: true },
  availability: { type: 'string', required: true, max: 80 },
  email: { type: 'string', required: true, max: 200, email: true },
  location: { type: 'string', max: 120 },
  instagram: { type: 'string', max: 300, url: true },
  linkedin: { type: 'string', max: 300, url: true },
  behance: { type: 'string', max: 300, url: true },
  dribbble: { type: 'string', max: 300, url: true },
};
const statSchema = {
  tag: { type: 'string', required: true, max: 30 },
  value: { type: 'string', required: true, max: 12 },
  text: { type: 'string', required: true, max: 160 },
  accent: { type: 'bool', default: false },
};
const highlightSchema = {
  value: { type: 'string', required: true, max: 12 },
  text: { type: 'string', required: true, max: 120 },
};

function validateList(list, itemSchema, count, name, errors) {
  if (!Array.isArray(list) || list.length !== count) {
    errors[name] = `Provide exactly ${count}.`;
    return null;
  }
  return list.map((item, i) => {
    try {
      return validate(item, itemSchema);
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err;
      for (const [k, msg] of Object.entries(err.fields)) errors[`${name}.${i}.${k}`] = msg;
      return null;
    }
  });
}

export function createSiteStore(db) {
  const read = db.prepare("SELECT value FROM settings WHERE key = 'site'");
  const write = db.prepare(
    "INSERT INTO settings (key, value) VALUES ('site', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
  );

  function get() {
    const row = read.get();
    return { ...DEFAULT_SITE, ...(row ? JSON.parse(row.value) : {}) };
  }

  function save(input) {
    const errors = {};
    let flat = {};
    try {
      flat = validate(input, schema);
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err;
      Object.assign(errors, err.fields);
    }
    const stats = validateList(input?.stats, statSchema, DEFAULT_SITE.stats.length, 'stats', errors);
    const highlights = validateList(input?.highlights, highlightSchema, DEFAULT_SITE.highlights.length, 'highlights', errors);
    if (Object.keys(errors).length) throw new ValidationError(errors);

    const site = { ...flat, stats, highlights };
    write.run(JSON.stringify(site));
    return get();
  }

  return { get, save };
}
