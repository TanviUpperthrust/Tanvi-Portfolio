import fs from 'node:fs';

// Project galleries omit removed decorative and restaurant entrance images.
// Source content is scoped to Work. Home and all other pages keep their existing data.
const imported = JSON.parse(fs.readFileSync(new URL('../content/framer-work.json', import.meta.url), 'utf8')).projects;
export function getWorkProjects({ site, projects = [] }, published = projects) {
  if (site.showProjectTemplates !== false) return projects;
  const updates = new Map(imported.map((project) => [project.slug, project]));
  const merged = published.map((project) => {
    const update = updates.get(project.slug);
    updates.delete(project.slug);
    return update ? { ...project, ...update, id: project.id, number: project.number } : project;
  });
  return [...merged, ...updates.values()].map((project, index) => ({ ...project, number: String(index + 1).padStart(2, '0') }));
}
