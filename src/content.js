// Shared definitions for the two editable content types, used by both the
// public read API and the admin CRUD API.

export const THEMES = ['s1', 's2', 's3', 's4'];
export const LAYOUTS = ['phone', 'wide', 'phone-profile', 'wide-sidebar'];

export const contentTypes = {
  projects: {
    table: 'projects',
    columns: ['title', 'category', 'tags', 'url', 'theme', 'layout', 'sort_order', 'published'],
    schema: {
      title: { type: 'string', required: true, max: 120 },
      category: { type: 'string', max: 120 },
      tags: { type: 'tags', default: [] },
      url: { type: 'string', max: 500, url: true },
      theme: { type: 'enum', values: THEMES, default: 's1' },
      layout: { type: 'enum', values: LAYOUTS, default: 'phone' },
      sort_order: { type: 'int', default: 0 },
      published: { type: 'bool', default: true },
    },
    toRow: (d) => ({ ...d, ...(d.tags !== undefined && { tags: JSON.stringify(d.tags) }), ...(d.published !== undefined && { published: d.published ? 1 : 0 }) }),
    fromRow: (r) => ({ ...r, tags: JSON.parse(r.tags), published: Boolean(r.published) }),
  },
  testimonials: {
    table: 'testimonials',
    columns: ['quote', 'name', 'role', 'sort_order', 'published'],
    schema: {
      quote: { type: 'string', required: true, max: 600 },
      name: { type: 'string', required: true, max: 120 },
      role: { type: 'string', max: 160 },
      sort_order: { type: 'int', default: 0 },
      published: { type: 'bool', default: true },
    },
    toRow: (d) => ({ ...d, ...(d.published !== undefined && { published: d.published ? 1 : 0 }) }),
    fromRow: (r) => ({ ...r, published: Boolean(r.published) }),
  },
};
