// Shared definitions for the two editable content types, used by both the
// public read API and the admin CRUD API.

export const THEMES = ['s1', 's2', 's3', 's4'];
export const LAYOUTS = ['phone', 'wide', 'phone-profile', 'wide-sidebar'];

// Contact form choices.
export const TOPICS = ['UX research', 'UI design', 'Full product design', 'Design system', 'Prototyping', 'Something else'];
export const BUDGETS = ['Under ₹1L', '₹1L – ₹3L', '₹3L – ₹6L', '₹6L+', 'Not sure yet'];

export function slugify(s) {
  return String(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const bool = (v) => (v === undefined ? {} : { published: v ? 1 : 0 });

export const contentTypes = {
  projects: {
    table: 'projects',
    columns: [
      'title', 'slug', 'category', 'tags', 'url', 'theme', 'layout',
      'summary', 'client', 'role', 'duration', 'challenge', 'approach', 'outcome', 'metrics',
      'sort_order', 'published',
    ],
    // Fields the public list endpoint returns; the full record is served per slug.
    listColumns: ['title', 'slug', 'category', 'tags', 'url', 'theme', 'layout', 'summary'],
    schema: {
      title: { type: 'string', required: true, max: 120 },
      slug: { type: 'string', max: 80, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, patternMessage: 'Lowercase letters, numbers and dashes only.' },
      category: { type: 'string', max: 120 },
      tags: { type: 'tags', default: [] },
      url: { type: 'string', max: 500, url: true },
      theme: { type: 'enum', values: THEMES, default: 's1' },
      layout: { type: 'enum', values: LAYOUTS, default: 'phone' },
      summary: { type: 'string', max: 400 },
      client: { type: 'string', max: 120 },
      role: { type: 'string', max: 120 },
      duration: { type: 'string', max: 60 },
      challenge: { type: 'string', max: 4000 },
      approach: { type: 'string', max: 6000 },
      outcome: { type: 'string', max: 4000 },
      metrics: { type: 'metrics', default: [] },
      sort_order: { type: 'int', default: 0 },
      published: { type: 'bool', default: true },
    },
    toRow: (d) => ({
      ...d,
      ...(d.tags !== undefined && { tags: JSON.stringify(d.tags) }),
      ...(d.metrics !== undefined && { metrics: JSON.stringify(d.metrics) }),
      ...bool(d.published),
    }),
    fromRow: (r) => ({
      ...r,
      tags: JSON.parse(r.tags),
      ...(r.metrics !== undefined && { metrics: JSON.parse(r.metrics) }),
      ...(r.published !== undefined && { published: Boolean(r.published) }),
    }),
  },
  testimonials: {
    table: 'testimonials',
    columns: ['quote', 'name', 'role', 'sort_order', 'published'],
    listColumns: ['quote', 'name', 'role'],
    schema: {
      quote: { type: 'string', required: true, max: 600 },
      name: { type: 'string', required: true, max: 120 },
      role: { type: 'string', max: 160 },
      sort_order: { type: 'int', default: 0 },
      published: { type: 'bool', default: true },
    },
    toRow: (d) => ({ ...d, ...bool(d.published) }),
    fromRow: (r) => ({ ...r, ...(r.published !== undefined && { published: Boolean(r.published) }) }),
  },
};
