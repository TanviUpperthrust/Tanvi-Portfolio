// Loaded in the document head so the chosen palette is applied before CSS.
(function () {
  'use strict';

  var key = 'tanvi-studio-theme';
  var root = document.documentElement;
  var theme = 'light';
  var button = null;
  var bound = false;

  function valid(value) { return value === 'light' || value === 'dark'; }
  try {
    var saved = window.localStorage.getItem(key);
    if (valid(saved)) theme = saved;
  } catch (error) { /* Restricted storage does not prevent appearance changes. */ }

  function syncButton() {
    if (!button) return;
    var next = theme === 'light' ? 'dark' : 'light';
    var action = 'Switch to ' + next + ' mode';
    button.setAttribute('aria-label', action);
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.setAttribute('title', action);
    button.querySelectorAll('[data-theme-icon]').forEach(function (icon) {
      icon.setAttribute('aria-hidden', 'true');
      if (icon.getAttribute('data-theme-icon') === next) icon.removeAttribute('hidden');
      else icon.setAttribute('hidden', '');
    });
    var label = button.querySelector('[data-theme-label]');
    if (label) label.textContent = next === 'dark' ? 'Dark mode' : 'Light mode';
  }
  function apply() {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f3ed' : '#111010');
    syncButton();
  }
  function wire() {
    if (bound) return;
    button = document.getElementById('themeToggle');
    if (button) {
      bound = true;
      button.addEventListener('click', function () {
        theme = theme === 'light' ? 'dark' : 'light';
        apply();
        try { window.localStorage.setItem(key, theme); } catch (error) { /* Session-only switching still works. */ }
      });
    }
    // Also catches a theme-color meta element parsed after this head script.
    apply();
    root.classList.add('theme-ready');
  }

  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true });
  else wire();
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    theme = valid(event.newValue) ? event.newValue : 'light';
    apply();
  });
})();
