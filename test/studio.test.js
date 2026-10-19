import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/assets/js/studio.js', import.meta.url), 'utf8');

function studio({ reduced = false, focused = true } = {}) {
  class Events {
    handlers = new Map();
    addEventListener(type, handler) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(handler);
    }
    dispatchEvent(event) { for (const handler of this.handlers.get(event.type) || []) handler(event); return true; }
    emit(type, data = {}) {
      const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...data };
      this.dispatchEvent(event);
      return event;
    }
  }
  const window = Object.assign(new Events(), { scrollY: 0, innerHeight: 1000 });
  const document = Object.assign(new Events(), { hidden: false, hasFocus: () => focused });
  let footerGlyphCount = 0;
  class Element extends Events {
    constructor(tag = 'div', classes = '') {
      super(); this.tagName = tag.toUpperCase(); this.classes = new Set(classes.split(' ').filter(Boolean));
    }
    children = [];
    nodeType = 1;
    get childNodes() { return this.children; }
    set className(value) { this.classes = new Set(value.split(' ').filter(Boolean)); }
    get className() { return [...this.classes].join(' '); }
    selectors = new Map();
    attributes = new Map();
    dataset = {};
    disabled = false;
    hidden = false;
    inert = false;
    textContent = '';
    top = 0;
    left = 100;
    width = 400;
    height = 100;
    style = { setProperty(name, value) { this[name] = value; } };
    classList = {
      contains: name => this.classes.has(name),
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      toggle: (name, value = !this.classes.has(name)) => { if (value) this.classes.add(name); else this.classes.delete(name); },
    };
    append(child) { this.children.push(child); child.parent = this; return child; }
    appendChild(child) { return this.append(child); }
    replaceChild(replacement, original) {
      const index = this.children.indexOf(original);
      const nodes = replacement.nodeType === 11 ? replacement.children : [replacement];
      this.children.splice(index, 1, ...nodes);
      nodes.forEach(node => { node.parent = this; });
    }
    contains(target) { return this === target || this.children.some(child => child === target || (child.contains && child.contains(target))); }
    querySelectorAll(selector) { return this.selectors.get(selector) || []; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === 'data-footer-letter') this.footerIndex = footerGlyphCount++;
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    hasAttribute(name) { return this.attributes.has(name); }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim();
        if (part === 'a[href]') return this.tagName === 'A' && this.hasAttribute('href');
        if (part === 'a' || part === 'button') return this.tagName === part.toUpperCase();
        if (part.startsWith('.')) return this.classes.has(part.slice(1).split('[')[0]);
        if (part.startsWith('[')) return this.hasAttribute(part.slice(1, -1));
        return false;
      });
    }
    closest(selector) { return this.matches(selector) ? this : (this.parent ? this.parent.closest(selector) : null); }
    focus() { document.activeElement = this; }
    click(data = {}) { if (!this.disabled) return this.emit('click', { button: 0, detail: 1, ...data }); }
    getBoundingClientRect() {
      if (this.footerIndex !== undefined) {
        const widthAxis = Number(this.style.fontVariationSettings?.match(/"wdth"\s+([\d.]+)/)?.[1] || 70);
        return { left: 100 + this.footerIndex * 60 + (this.footerIndex >= 5 ? 20 : 0), top: 4000 - window.scrollY, width: 60 + (widthAxis - 70) * 0.4, height: 180 };
      }
      return { left: this.left, top: this.top - window.scrollY, width: this.width, height: this.height };
    }
  }
  const root = new Element(), body = new Element(), header = new Element();
  root.scrollHeight = 5000;
  Object.assign(document, { documentElement: root, body, activeElement: body });
  const menuButton = new Element('button'), menu = new Element();
  const menuLinks = ['Work', 'About', 'Contact'].map(label => {
    const link = menu.append(new Element('a')); link.textContent = label; link.setAttribute('href', '/' + label.toLowerCase()); return link;
  });
  menu.selectors.set('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', menuLinks);
  const toggles = [new Element('button'), new Element('button')];
  const times = [new Element('time'), new Element('time')];
  const featured = new Element();
  const rows = [1000, 1400, 1800].map((top, index) => {
    const row = new Element('a'); row.top = top; row.setAttribute('href', '/work/project-' + index); return row;
  });
  const previews = rows.map(() => new Element('article'));
  const previewLinks = previews.map(preview => preview.append(new Element('a')));
  featured.selectors.set('[data-featured-index]', rows);
  featured.selectors.set('[data-featured-slide]', previews);
  const viewButtons = ['list', 'grid'].map(value => { const button = new Element('button'); button.dataset.workView = value; return button; });
  const panels = ['list', 'grid'].map(value => { const panel = new Element(); panel.dataset.viewPanel = value; panel.hidden = value !== 'list'; return panel; });
  const collection = new Element(), track = new Element();
  track.scrollLeft = 0;
  const aura = new Element(), cursor = new Element(), cursorLabel = new Element();
  const card = new Element('a', 'project-card'); card.top = 1000; card.height = 200;
  card.setAttribute('data-cursor-label', 'View');
  const letter = new Element('span'); letter.setAttribute('data-hero-letter', ''); letter.top = 200; letter.width = 100;
  const title = new Element('h1'); title.setAttribute('data-kinetic', ''); title.textContent = 'Work HI (05)';
  const count = title.append(new Element('sup')); count.textContent = '(05)';
  title.children.unshift({ nodeType: 3, textContent: 'Work ' });
  const accent = new Element('span'); accent.className = 'title-accent';
  accent.append({ nodeType: 3, textContent: 'HI ' });
  title.children.splice(1, 0, accent);
  const magnet = new Element('button', 'pill-button'); magnet.setAttribute('data-magnet', ''); magnet.top = 1000; magnet.height = 50;
  const footer = new Element('a', 'footer-title');
  footer.setAttribute('data-footer-cta', ''); footer.setAttribute('data-cursor-label', "Let's go");
  footer.setAttribute('href', '/contact'); footer.setAttribute('aria-label', "Let's talk about your project");
  footer.top = 4000; footer.width = 1000; footer.height = 200;
  const footerText = footer.append(new Element('span', 'footer-title-text'));
  footerText.setAttribute('data-kinetic-footer', ''); footerText.textContent = "LET'S TALK";
  footerText.top = 4000; footerText.width = 560; footerText.height = 180;
  footerText.append({ nodeType: 3, textContent: "LET'S TALK" });
  const animations = [];
  Element.prototype.animate = function (keyframes, options) {
    const animation = { element: this, keyframes, options, cancelled: false, cancel() { this.cancelled = true; }, pause() {}, play() {} };
    animations.push(animation);
    return animation;
  };
  const nameLine = new Element(), progress = new Element();
  const selectors = new Map([
    ['[data-motion-toggle]', toggles], ['[data-local-time]', times],
    ['.featured-layout', [featured]], ['.cursor-aura', [aura]], ['.custom-cursor', [cursor]], ['.cursor-label', [cursorLabel]],
    ['.scroll-progress', [progress]], ['.home-name .name-line', [nameLine]], ['[data-hero-letter]', [letter]],
    ['[data-kinetic]', [title]], ['[data-magnet], .pill-button, .outline-button, .header-cta', [magnet]],
    ['[data-kinetic-footer]', [footerText]],
    ['.project-card, .project-art, .work-table-row[data-project-preview], .about-portrait, [data-portrait]', [card]],
    ['[data-work-view]', viewButtons], ['[data-view-panel]', panels], ['.work-collection', [collection]], ['.detail-track', [track]],
  ]);
  const ids = { siteHeader: header, menuToggle: menuButton, siteMenu: menu };
  document.getElementById = id => ids[id] || null;
  document.querySelectorAll = selector => selectors.get(selector) || [];
  document.querySelector = selector => document.querySelectorAll(selector)[0] || null;
  document.createElement = tag => new Element(tag);
  document.createTextNode = text => ({ nodeType: 3, textContent: text });
  document.createDocumentFragment = () => Object.assign(new Element(), { nodeType: 11 });
  const reducedQuery = Object.assign(new Events(), { matches: reduced });
  const fineQuery = Object.assign(new Events(), { matches: true });
  window.matchMedia = query => query.includes('prefers-reduced-motion') ? reducedQuery : fineQuery;
  const frames = new Map(), intervals = new Map(), timers = new Map();
  let nextId = 0;
  window.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setInterval = (callback, delay) => { intervals.set(++nextId, { callback, delay }); return nextId; };
  window.clearInterval = id => intervals.delete(id);
  window.setTimeout = callback => { timers.set(++nextId, callback); return nextId; };
  window.clearTimeout = id => timers.delete(id);
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  runInNewContext(source, { window, document, CustomEvent });
  function flush() {
    let count = 0;
    while (frames.size) {
      assert.ok(++count < 140, 'input easing must settle without a perpetual animation loop');
      const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
    }
  }
  flush();
  return {
    window, document, root, body, header, menu, menuButton, menuLinks, toggles, times, intervals, flush,
    featured, rows, previews, previewLinks, viewButtons, panels, collection, track, card, letter, cursor, cursorLabel, aura,
    title, count, accent, magnet, animations, footer, footerText,
    footerGlyphs: footerText.children.filter(node => node.nodeType === 1).flatMap(word => word.children),
    scroll(y) { window.scrollY = y; window.emit('scroll'); flush(); },
    preference(value) { reducedQuery.matches = value; reducedQuery.emit('change'); flush(); },
    fine(value) { fineQuery.matches = value; fineQuery.emit('change'); flush(); },
    visibility(hidden) { document.hidden = hidden; document.emit('visibilitychange'); flush(); },
  };
}

test('fullscreen menu traps keyboard focus, closes on Escape or navigation, and restores its button', () => {
  const page = studio();
  assert.equal(page.menu.hidden, true);
  assert.equal(page.menu.inert, true);
  page.menuButton.click();
  assert.equal(page.menuButton.getAttribute('aria-expanded'), 'true');
  assert.equal(page.root.classList.contains('menu-open'), true);
  assert.equal(page.body.classList.contains('menu-open'), true);
  assert.equal(page.document.activeElement, page.menuLinks[0]);
  page.menuLinks.at(-1).focus();
  assert.equal(page.document.emit('keydown', { key: 'Tab' }).defaultPrevented, true);
  assert.equal(page.document.activeElement, page.menuButton);
  page.document.emit('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(page.document.activeElement, page.menuLinks.at(-1));
  page.document.emit('keydown', { key: 'Escape' });
  assert.equal(page.menu.hidden, true);
  assert.equal(page.menu.inert, true);
  assert.equal(page.document.activeElement, page.menuButton);
  page.menuButton.click();
  const navigation = page.menu.emit('click', { target: page.menuLinks[0] });
  assert.equal(navigation.defaultPrevented, false, 'menu links retain native navigation');
  assert.equal(page.menu.hidden, true);
});

test('motion controls preserve manual pause across device changes and IST clocks suspend while hidden', () => {
  const page = studio();
  page.toggles[0].click(); page.flush();
  assert.ok(page.toggles.every(button => button.getAttribute('aria-pressed') === 'true'));
  page.preference(true); page.preference(false);
  assert.equal(page.root.classList.contains('motion-paused'), true);
  page.toggles[1].click(); page.flush();
  assert.equal(page.root.classList.contains('motion-paused'), false);
  page.preference(true);
  assert.ok(page.toggles.every(button => button.disabled));
  page.preference(false);
  assert.equal(page.root.classList.contains('motion-paused'), false);
  assert.equal(page.intervals.size, 1);
  assert.equal([...page.intervals.values()][0].delay, 60000);
  page.times.forEach(time => { assert.match(time.textContent, /^\d{2}:\d{2}$/); assert.ok(Number.isFinite(Date.parse(time.dateTime))); });
  page.visibility(true);
  assert.equal(page.intervals.size, 0);
  page.visibility(false);
  assert.equal(page.intervals.size, 1);
});

test('featured previews follow scroll and row intent while preserving focused preview links', () => {
  const page = studio();
  page.scroll(1000);
  assert.equal(page.previews[1].classList.contains('is-active'), true);
  assert.equal(page.rows[1].getAttribute('aria-current'), 'true');
  assert.equal(page.previews[0].inert, true);
  page.previewLinks[1].focus();
  page.scroll(1500);
  assert.equal(page.previews[1].inert, false, 'focused preview remains usable');
  page.body.focus(); page.featured.emit('focusout'); page.flush();
  assert.equal(page.previews[2].classList.contains('is-active'), true);
  page.rows[0].emit('pointerenter'); page.flush();
  assert.equal(page.previews[0].classList.contains('is-active'), true);
  assert.equal(page.rows[0].click().defaultPrevented, false, 'a project row navigates to its detail page');
  page.rows[0].emit('pointerleave'); page.flush();
  assert.equal(page.previews[2].getAttribute('aria-hidden'), null);
});

test('work views switch accessibly and detail dragging preserves ordinary and keyboard clicks', () => {
  const page = studio();
  page.viewButtons[1].click(); page.flush();
  assert.equal(page.collection.dataset.view, 'grid');
  assert.equal(page.panels[0].hidden, true);
  assert.equal(page.panels[1].hidden, false);
  assert.equal(page.viewButtons[1].getAttribute('aria-pressed'), 'true');
  page.track.emit('pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 300 });
  page.window.emit('pointermove', { pointerId: 1, clientX: 297, clientY: 200 });
  page.window.emit('pointerup', { pointerId: 1 });
  assert.equal(page.track.click().defaultPrevented, false);
  page.track.emit('pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 300 });
  page.window.emit('pointermove', { pointerId: 1, clientX: 200, clientY: 200 });
  page.window.emit('pointerup', { pointerId: 1 });
  assert.equal(page.track.scrollLeft, 100);
  assert.equal(page.track.click().defaultPrevented, true);
  assert.equal(page.track.click({ detail: 0 }).defaultPrevented, false);
  page.flush();
});

test('cursor and variable letter axes settle after input, remain bounded, and reset when paused', () => {
  const page = studio();
  assert.equal(page.title.getAttribute('aria-label'), 'Work HI (05)');
  assert.equal(page.title.children.at(-1), page.count, 'title splitting preserves its superscript element');
  assert.equal(page.accent.children[0].className, 'kinetic-word', 'colored nested title text also animates');
  assert.ok(page.animations.some(animation => animation.options.duration === 1300));
  page.window.emit('pointermove', { target: page.letter, clientX: 150, clientY: 250, pointerType: 'mouse' });
  page.flush();
  assert.match(page.letter.style.fontVariationSettings, /"wdth" 125\.00/);
  assert.match(page.letter.style.fontVariationSettings, /"wght" 260\.00/);
  page.scroll(900);
  page.window.emit('pointermove', { target: page.card, clientX: 5000, clientY: -5000, pointerType: 'mouse' });
  page.document.emit('pointerover', { target: page.card });
  page.flush();
  assert.ok(Math.abs(parseFloat(page.card.style['--pointer-x'])) <= 8);
  assert.ok(Math.abs(parseFloat(page.card.style['--pointer-y'])) <= 8);
  assert.equal(page.cursor.classList.contains('is-link'), true);
  assert.equal(page.cursorLabel.textContent, 'View');
  assert.equal(page.body.classList.contains('cursor-active'), true);
  assert.equal(page.header.classList.contains('is-scrolled'), true);
  page.window.emit('pointermove', { target: page.magnet, clientX: 5000, clientY: -5000, pointerType: 'mouse' });
  page.flush();
  assert.ok(Math.abs(parseFloat(page.magnet.style['--magnet-x'])) <= 8);
  assert.notEqual(page.magnet.style.translate, '0.00px 0.00px');
  page.toggles[0].click(); page.flush();
  assert.equal(page.cursor.style.opacity, '0');
  assert.equal(parseFloat(page.card.style['--pointer-x']), 0);
  assert.equal(page.magnet.style.translate, '0.00px 0.00px');
  assert.ok(page.animations.every(animation => animation.cancelled));
  assert.match(page.letter.style.fontVariationSettings, /"wdth" 70\.00/);
});

function footerAxes(glyph) {
  const values = [...glyph.style.fontVariationSettings.matchAll(/"(?:wdth|wght)"\s+([\d.]+)/g)].map(match => Number(match[1]));
  return { width: values[0], weight: values[1] };
}

test('footer glyphs respond only inside the CTA, preserve its label, and use the large cursor through nested targets', () => {
  const page = studio({ focused: false });
  assert.equal(page.footerGlyphs.length, 9);
  assert.equal(page.footer.getAttribute('aria-label'), "Let's talk about your project");
  assert.ok(page.animations.every(animation => !page.footerGlyphs.includes(animation.element)), 'offscreen footer glyphs have no entry animation');
  page.scroll(3500);
  page.footerText.width = page.footer.width;
  page.window.emit('resize');
  const s = page.footerGlyphs[4];
  page.window.emit('pointermove', { target: s, clientX: 370, clientY: 590, pointerType: 'mouse' });
  page.document.emit('pointerover', { target: s, pointerType: 'mouse' });
  page.flush();
  assert.equal(footerAxes(s).width, 125, 'a full-width wrapper must not consume the real glyph growth budget');
  assert.equal(footerAxes(s).weight, 260);
  assert.equal(page.cursor.classList.contains('is-footer'), true, 'real page pointer input works even while the address bar owns focus');
  assert.equal(page.cursorLabel.textContent, "Let's go");
  page.document.emit('pointerout', { target: s, relatedTarget: page.footerGlyphs[5], pointerType: 'mouse' });
  page.flush();
  assert.equal(page.cursor.classList.contains('is-footer'), true, 'moving between letters keeps the footer badge');
  page.window.emit('pointermove', { target: page.body, clientX: 370, clientY: 590, pointerType: 'mouse' });
  page.flush();
  assert.equal(page.cursor.classList.contains('is-footer'), false);
  assert.ok(page.footerGlyphs.every(glyph => footerAxes(glyph).width === 70), 'nearby pointers outside the CTA cannot morph its text');
});

test('footer hover uses a shared width budget and resets on leave, pause, reduction, touch and hidden windows', () => {
  const page = studio();
  page.scroll(3500);
  page.footer.width = 575;
  page.window.emit('resize');
  page.window.emit('pointermove', { target: page.footerGlyphs[4], clientX: 370, clientY: 590, pointerType: 'mouse' });
  page.flush();
  const growth = page.footerGlyphs.reduce((sum, glyph) => sum + (footerAxes(glyph).width - 70) * 0.4, 0);
  assert.ok(growth > 0 && growth <= 15, 'measured glyph growth fits the remaining line width');
  assert.ok(page.footerGlyphs.every(glyph => { const axes = footerAxes(glyph); return axes.width >= 70 && axes.width <= 125 && axes.weight >= 260 && axes.weight <= 800; }));
  const hover = () => { page.window.emit('pointermove', { target: page.footerGlyphs[4], clientX: 370, clientY: 590, pointerType: 'mouse' }); page.flush(); };
  const reset = () => {
    assert.ok(page.footerGlyphs.every(glyph => footerAxes(glyph).width === 70));
    assert.equal(page.cursor.classList.contains('is-footer'), false);
  };
  page.footer.emit('pointerleave', { relatedTarget: page.body }); page.flush(); reset();
  hover(); page.toggles[0].click(); page.flush(); reset();
  page.toggles[0].click(); page.flush(); hover(); page.preference(true); reset();
  page.preference(false); hover(); page.fine(false); reset();
  page.fine(true); hover();
  page.window.emit('pointermove', { target: page.footerGlyphs[4], clientX: 370, clientY: 590, pointerType: 'touch' }); page.flush(); reset();
  hover(); page.visibility(true); reset();
  page.visibility(false); hover(); page.window.emit('blur'); page.flush(); reset();
});

test('footer keyboard focus can morph the type while its Enter navigation stays native', () => {
  const page = studio();
  page.footer.focus(); page.footer.emit('focusin'); page.flush();
  assert.ok(page.footerGlyphs.some(glyph => footerAxes(glyph).width > 70));
  assert.equal(page.cursor.classList.contains('is-footer'), false, 'keyboard focus does not create a pointer badge');
  assert.equal(page.document.emit('click', { target: page.footer, button: 0, detail: 0 }).defaultPrevented, false);
  page.body.focus(); page.footer.emit('focusout'); page.flush();
  assert.ok(page.footerGlyphs.every(glyph => footerAxes(glyph).width === 70));
});
