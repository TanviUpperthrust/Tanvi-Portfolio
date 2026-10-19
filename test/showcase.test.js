import test from 'node:test';
import assert from 'node:assert/strict';
import { homePage } from '../src/views/home.js';
import { DEFAULT_SITE, SEED_PROJECTS } from '../src/seed.js';
import { getShowcaseProjects } from '../src/showcase.js';

test('project template mode provides five reachable, clearly marked projects beneath the personal hero', () => {
  const page = String(homePage({ site: DEFAULT_SITE, projects: SEED_PROJECTS, testimonials: [] }));
  assert.equal((page.match(/data-project-template="true"/g) || []).length, 5);
  assert.match(page, /aria-label="Tanvi, UI\s*\/\s*UX designer"/i);
  assert.match(page, /class="[^"]*\bhome-hero\b/);
  assert.match(page, /Project 05/);
  const hero = page.indexOf('id="top"');
  const work = page.indexOf('id="work"');
  const about = page.indexOf('id="about"');
  const services = page.indexOf('id="services"');
  assert.ok(hero >= 0 && hero < work && work < about && about < services, 'selected work follows the hero, then the About and Services teasers');
  assert.equal((page.match(/id="work"/g) || []).length, 1, 'the work section has a unique anchor');
  for (let index = 1; index <= 5; index++) {
    assert.ok(page.includes(`href="/work/project-${String(index).padStart(2, '0')}"`), 'templates link to their honest preparation pages');
  }
  assert.doesNotMatch(page, /id="contactForm"|id="quotesData"|data-work-slide/);
});

test('published showcase supports five real projects without a fourth-project cap', () => {
  const projects = [...SEED_PROJECTS, { ...SEED_PROJECTS[0], title: 'Fifth project', slug: 'fifth-project' }, { ...SEED_PROJECTS[0], title: 'Sixth project', slug: 'sixth-project' }];
  const page = String(homePage({ site: { ...DEFAULT_SITE, showProjectTemplates: false }, projects, testimonials: [] }));
  assert.match(page, /href="\/work\/fifth-project"/);
  assert.doesNotMatch(page, /href="\/work\/sixth-project"/);
  for (const project of projects.slice(0, 5)) assert.ok(page.includes(`href="/work/${project.slug}"`));
  assert.doesNotMatch(page, /data-project-template=/);
});

test('showcase normalization has stable template URLs and never mutates the published source', () => {
  const source = SEED_PROJECTS.map((project) => ({ ...project }));
  const before = JSON.stringify(source);
  const templates = getShowcaseProjects({ site: DEFAULT_SITE, projects: source });
  assert.equal(templates.length, 5);
  assert.deepEqual(templates.map((project) => project.slug), ['project-01', 'project-02', 'project-03', 'project-04', 'project-05']);
  assert.ok(templates.every((project) => project.template === true && project.metrics.length === 0));
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(getShowcaseProjects({ site: { ...DEFAULT_SITE, showProjectTemplates: false }, projects: source }), source);
  assert.deepEqual(getShowcaseProjects({ site: { ...DEFAULT_SITE, showProjectTemplates: false }, projects: [] }), []);
});
