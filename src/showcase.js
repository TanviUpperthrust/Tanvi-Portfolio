export function getShowcaseProjects({ site, projects = [] }) {
  if (site.showProjectTemplates === false) return projects.slice(0, 5);
  return Array.from({ length: 5 }, (_, index) => ({
    id: `template-${index + 1}`, template: true,
    number: String(index + 1).padStart(2, '0'), title: `Project ${String(index + 1).padStart(2, '0')}`,
    slug: `project-${String(index + 1).padStart(2, '0')}`, category: 'UI / UX case study',
    summary: 'A new case study is taking shape. The project, thinking and details will be shared here.',
    tags: ['Case study in preparation'], role: 'UI / UX design', year: 'Coming soon',
    layout: index % 2 ? 'wide' : 'phone', theme: `s${index % 4 + 1}`,
    client: '', duration: '', challenge: '', approach: '', outcome: '', metrics: [], url: '',
  }));
}
