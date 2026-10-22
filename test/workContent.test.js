import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getWorkProjects } from '../src/workContent.js';
import { projectPage } from '../src/views/project.js';
const original = JSON.parse(fs.readFileSync(new URL('../content/portfolio-import.json', import.meta.url))).projects;
const source = JSON.parse(fs.readFileSync(new URL('../content/framer-work.json', import.meta.url))).projects;
test('Framer content updates Work only and adds procurement without replacing StreamBot', () => {
  const before = structuredClone(original);
  const result = getWorkProjects({site:{showProjectTemplates:false},projects:original}, original);
  assert.deepEqual(original, before);
  assert.equal(result.length, 6);
  assert.ok(result.some(p => p.slug === 'streambot-movie-recommendation-chatbot'));
  assert.ok(result.some(p => p.slug === 'procurement-and-inventory-management-system'));
  const templates = [{slug:'project-01',template:true}];
  assert.equal(getWorkProjects({site:{showProjectTemplates:true},projects:templates}), templates);
});
test('all source case-study sections and downloaded images render through the existing layout', () => {
  for (const project of source) {
    assert.equal(project.sections.filter(s => s.body && s.heading !== 'Project overview' && s.heading !== 'Project credits').length, 4);
    const rendered = String(projectPage({project,site:{email:'test@example.com',location:'Worldwide'},siteUrl:'https://example.com'}));
    for (const image of [project.coverImage,...project.sections.flatMap(s=>s.images.map(i=>i.src))]) {
      assert.ok(fs.statSync(new URL('../public'+image,import.meta.url)).size > 0, image);
      assert.ok(rendered.includes(image), image);
    }
  }
});
