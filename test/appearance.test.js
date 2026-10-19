import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/assets/js/appearance.js', import.meta.url), 'utf8');
const KEY = 'tanvi-studio-theme';

function appearance({ saved = null, inaccessible = false, writeFails = false, ready = 'loading', hasButton = true } = {}) {
  class Events {
    handlers = new Map();
    addEventListener(type, callback) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(callback);
    }
    emit(type, event = {}) { for (const callback of this.handlers.get(type) || []) callback({ type, ...event }); }
  }
  class Element extends Events {
    attributes = new Map();
    style = {};
    textContent = '';
    classes = new Set();
    classList = { add: name => this.classes.add(name), contains: name => this.classes.has(name) };
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    hasAttribute(name) { return this.attributes.has(name); }
  }
  const root = new Element(), meta = new Element(), button = new Element(), label = new Element();
  const lightIcon = new Element(), darkIcon = new Element();
  lightIcon.setAttribute('data-theme-icon', 'light');
  darkIcon.setAttribute('data-theme-icon', 'dark');
  button.querySelectorAll = selector => selector === '[data-theme-icon]' ? [lightIcon, darkIcon] : [];
  button.querySelector = selector => selector === '[data-theme-label]' ? label : null;
  const document = Object.assign(new Events(), {
    documentElement: root, readyState: ready,
    querySelector: selector => selector === 'meta[name="theme-color"]' ? meta : null,
    getElementById: id => id === 'themeToggle' && hasButton ? button : null,
  });
  const values = new Map(saved === null ? [] : [[KEY, saved]]);
  let writes = 0;
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (writeFails) throw Error('Storage write blocked'); writes++; values.set(key, value); },
  };
  const window = new Events();
  window.matchMedia = () => { throw Error('The default theme must not depend on OS appearance'); };
  Object.defineProperty(window, 'localStorage', { get() { if (inaccessible) throw Error('Storage access blocked'); return storage; } });
  runInNewContext(source, { window, document });
  return {
    root, meta, button, lightIcon, darkIcon, label, values,
    writes: () => writes,
    ready() { document.readyState = 'complete'; document.emit('DOMContentLoaded'); },
    click() { button.emit('click'); },
    storage(key, newValue) { window.emit('storage', { key, newValue }); },
  };
}

function assertTheme(page, theme) {
  assert.equal(page.root.getAttribute('data-theme'), theme);
  assert.equal(page.root.style.colorScheme, theme);
  assert.equal(page.meta.getAttribute('content'), theme === 'light' ? '#f5f3ed' : '#111010');
}

test('a first visit applies light mode synchronously before DOM readiness regardless of OS', () => {
  const page = appearance();
  assertTheme(page, 'light');
  assert.equal(page.button.getAttribute('aria-label'), null, 'the head script does not require the button to exist yet');
  assert.equal(page.root.classList.contains('theme-ready'), false, 'initial paint is not given color transitions');
  page.ready();
  assert.equal(page.root.classList.contains('theme-ready'), true);
  assert.equal(page.button.getAttribute('aria-label'), 'Switch to dark mode');
  assert.equal(page.button.getAttribute('aria-pressed'), 'false');
  assert.equal(page.writes(), 0, 'initial rendering does not create an unnecessary preference');
});

test('only validated saved light/dark preferences are restored', () => {
  for (const [saved, expected] of [['dark', 'dark'], ['light', 'light'], ['sepia', 'light'], ['DARK', 'light'], ['', 'light']]) {
    assertTheme(appearance({ saved }), expected);
  }
});

test('toggle persists both themes and keeps labels, pressed state and next-action icons accessible', () => {
  const page = appearance();
  page.ready();
  assert.equal(page.darkIcon.hasAttribute('hidden'), false);
  assert.equal(page.lightIcon.hasAttribute('hidden'), true);
  page.click();
  assertTheme(page, 'dark');
  assert.equal(page.values.get(KEY), 'dark');
  assert.equal(page.button.getAttribute('aria-pressed'), 'true');
  assert.equal(page.button.getAttribute('aria-label'), 'Switch to light mode');
  assert.equal(page.button.getAttribute('title'), 'Switch to light mode');
  assert.equal(page.label.textContent, 'Light mode');
  assert.equal(page.lightIcon.hasAttribute('hidden'), false);
  assert.equal(page.darkIcon.hasAttribute('hidden'), true);
  assert.equal(page.lightIcon.getAttribute('aria-hidden'), 'true');
  page.click();
  assertTheme(page, 'light');
  assert.equal(page.values.get(KEY), 'light');
  assert.equal(page.button.getAttribute('aria-pressed'), 'false');
  assert.equal(page.writes(), 2);
});

test('restricted storage access and failed persistence do not prevent theme switching', () => {
  for (const options of [{ inaccessible: true }, { writeFails: true }]) {
    const page = appearance(options);
    assertTheme(page, 'light');
    page.ready();
    assert.doesNotThrow(() => page.click());
    assertTheme(page, 'dark');
    assert.equal(page.writes(), 0);
    assert.equal(page.button.getAttribute('aria-pressed'), 'true');
  }
});

test('cross-tab changes update appearance and the control without writing storage again', () => {
  const page = appearance({ ready: 'complete' });
  page.storage('unrelated-setting', 'dark');
  assertTheme(page, 'light');
  page.storage(KEY, 'dark');
  assertTheme(page, 'dark');
  assert.equal(page.button.getAttribute('aria-label'), 'Switch to light mode');
  page.storage(KEY, null);
  assertTheme(page, 'light');
  page.storage(KEY, 'invalid');
  assertTheme(page, 'light');
  page.storage(KEY, 'dark');
  page.storage(null, null);
  assertTheme(page, 'light');
  assert.equal(page.writes(), 0);
  assert.doesNotThrow(() => appearance({ hasButton: false, ready: 'complete' }));
});
